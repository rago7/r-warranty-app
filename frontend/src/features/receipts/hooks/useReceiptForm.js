import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createReceipt, updateReceipt } from '../api'

const DEFAULT_CURRENCY = 'USD'
const MONEY_PRECISION = 100

export function toCents(value) {
    const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    if (!Number.isFinite(num)) return 0
    return Math.round(num * MONEY_PRECISION)
}

export function fromCents(value) {
    if (value == null) return ''
    const cents = Number(value)
    if (!Number.isFinite(cents)) return ''
    return (cents / MONEY_PRECISION).toFixed(2)
}

export function sumLineTotals(items) {
    if (!Array.isArray(items)) return 0
    return items.reduce((sum, item) => {
        const raw = item?.lineTotal ?? item?.line_total ?? item?.lineTotalCents
        const amount = typeof raw === 'string' ? Number.parseFloat(raw) : Number(raw)
        if (!Number.isFinite(amount)) return sum
        return sum + amount
    }, 0)
}

function normaliseMoneyInput(value, fallback = '0.00') {
    if (value == null || value === '') return fallback
    const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    if (!Number.isFinite(num)) return fallback
    return (Math.round(num * MONEY_PRECISION) / MONEY_PRECISION).toFixed(2)
}

function parseMoney(value) {
    if (value == null || value === '') return 0
    const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    return Number.isFinite(num) ? num : 0
}

function emptyWarranty() {
    return {
        type: 'manufacturer',
        provider: '',
        policyNumber: '',
        startDate: '',
        endDate: '',
        termsUrl: '',
        coverageNotes: '',
        warrantyDocId: '',
    }
}

function emptyLineItem() {
    return {
        id: null,
        name: '',
        quantity: 1,
        unitPrice: '0.00',
        lineTotal: '0.00',
        categoryId: '',
        returnableUntil: '',
        warrantyApplicable: false,
        warranty: emptyWarranty(),
    }
}

function baseForm() {
    return {
        purchase: {
            merchantId: '',
            merchantName: '',
            purchaseDate: '',
            purchaseTime: '',
            currency: DEFAULT_CURRENCY,
            paymentMethodType: 'card',
            notes: '',
            subtotal: '0.00',
            tax: '0.00',
            tip: '0.00',
            discount: '0.00',
            total: '0.00',
        },
        lineItems: [emptyLineItem()],
        purchaseLevelWarranty: {
            enabled: false,
            warranty: emptyWarranty(),
        },
        documentId: '',
    }
}

function mapWarrantyFromDetail(warranty) {
    if (!warranty) return emptyWarranty()
    return {
        type: warranty.type ?? 'manufacturer',
        provider: warranty.provider ?? '',
        policyNumber: warranty.policy_number ?? warranty.policyNumber ?? '',
        startDate: warranty.start_date ?? warranty.startDate ?? '',
        endDate: warranty.end_date ?? warranty.endDate ?? '',
        termsUrl: warranty.terms_url ?? warranty.termsUrl ?? '',
        coverageNotes: warranty.coverage_notes ?? warranty.coverageNotes ?? '',
        warrantyDocId: warranty.warranty_doc_id ?? warranty.warrantyDocId ?? '',
    }
}

function mapLineItemFromDetail(item) {
    const mapped = emptyLineItem()
    if (!item) return mapped
    mapped.id = item.id ?? null
    mapped.name = item.name ?? mapped.name
    mapped.quantity = item.quantity != null ? item.quantity : mapped.quantity
    mapped.unitPrice = normaliseMoneyInput(
        item.unit_price != null ? item.unit_price : fromCents(item.unit_price_cents),
        mapped.unitPrice,
    )
    mapped.lineTotal = normaliseMoneyInput(
        item.line_total != null ? item.line_total : fromCents(item.line_total_cents),
        mapped.lineTotal,
    )
    mapped.categoryId = item.category_id ?? mapped.categoryId
    mapped.returnableUntil = item.returnable_until ?? mapped.returnableUntil
    const hasWarranty = Boolean(item.warranty_applicable ?? item.warranty)
    mapped.warrantyApplicable = hasWarranty
    const resolvedWarranty = item.warranty ?? null
    mapped.warranty = hasWarranty ? mapWarrantyFromDetail(resolvedWarranty) : emptyWarranty()
    return mapped
}

function mapPurchaseFromDetail(purchase = {}, merchant = {}) {
    const form = baseForm()
    const next = { ...form.purchase }
    const purchaseAt = purchase.purchase_at ?? purchase.purchaseAt ?? ''
    if (purchaseAt) {
        const date = purchaseAt.slice(0, 10)
        const time = purchaseAt.slice(11, 16)
        next.purchaseDate = date
        next.purchaseTime = time
    }
    next.merchantId = purchase.merchant_id ?? merchant.id ?? ''
    next.merchantName = merchant.name ?? ''
    next.currency = purchase.currency ?? DEFAULT_CURRENCY
    next.paymentMethodType = purchase.payment_method_type ?? purchase.paymentMethodType ?? 'card'
    next.notes = purchase.notes ?? ''
    next.subtotal = normaliseMoneyInput(purchase.subtotal ?? fromCents(purchase.subtotal_cents))
    next.tax = normaliseMoneyInput(purchase.tax ?? fromCents(purchase.tax_cents))
    next.tip = normaliseMoneyInput(purchase.tip ?? fromCents(purchase.tip_cents))
    next.discount = normaliseMoneyInput(purchase.discount ?? fromCents(purchase.discount_cents))
    next.total = normaliseMoneyInput(purchase.total ?? fromCents(purchase.total_cents))
    return next
}

export function detailToForm(detail) {
    if (!detail) {
        return baseForm()
    }

    const attrs = detail?.data?.attributes ?? detail?.attributes ?? detail ?? {}
    const form = baseForm()
    form.purchase = mapPurchaseFromDetail(attrs.purchase, attrs.merchant)

    const lineItems = Array.isArray(attrs.line_items)
        ? attrs.line_items.map((item) => mapLineItemFromDetail(item)).filter(Boolean)
        : []
    form.lineItems = lineItems.length > 0 ? lineItems : [emptyLineItem()]

    const purchaseWarranty = attrs.purchase_level_warranty ?? null
    if (purchaseWarranty) {
        form.purchaseLevelWarranty = {
            enabled: true,
            warranty: mapWarrantyFromDetail(purchaseWarranty),
        }
    }

    form.documentId = attrs.document_id ?? attrs.documentId ?? ''
    return form
}

function mapWarrantyForApi(warranty) {
    if (!warranty) return null
    return {
        type: warranty.type || 'manufacturer',
        provider: warranty.provider || '',
        policy_number: warranty.policyNumber || '',
        start_date: warranty.startDate || null,
        end_date: warranty.endDate || null,
        terms_url: warranty.termsUrl || '',
        coverage_notes: warranty.coverageNotes || '',
        warranty_doc_id: warranty.warrantyDocId || null,
    }
}

export function formToApi(form) {
    const source = form ?? baseForm()
    const purchase = source.purchase ?? {}
    const lineItems = Array.isArray(source.lineItems) ? source.lineItems : []

    let purchaseAt = null
    if (purchase.purchaseDate) {
        const time = purchase.purchaseTime ? `${purchase.purchaseTime}` : '00:00'
        const isoCandidate = new Date(`${purchase.purchaseDate}T${time}:00`)
        if (!Number.isNaN(isoCandidate.getTime())) {
            purchaseAt = isoCandidate.toISOString()
        }
    }

    const payload = {
        purchase: {
            merchant_id: purchase.merchantId || null,
            purchase_at: purchaseAt,
            currency: purchase.currency || DEFAULT_CURRENCY,
            merchant_name: purchase.merchantName || null,
            subtotal: parseMoney(purchase.subtotal),
            tax: parseMoney(purchase.tax),
            tip: parseMoney(purchase.tip),
            discount: parseMoney(purchase.discount),
            total: parseMoney(purchase.total),
            payment_method_type: purchase.paymentMethodType || null,
            notes: purchase.notes || '',
        },
        line_items: lineItems
            .filter((item) => (item?.name || '').trim().length > 0)
            .map((item) => {
                const qty = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0
                const unitPrice = parseMoney(item.unitPrice)
                const lineTotal = parseMoney(item.lineTotal)
                const base = {
                    name: item.name,
                    quantity: qty,
                    unit_price: unitPrice,
                    line_total: lineTotal,
                    category_id: item.categoryId || null,
                    returnable_until: item.returnableUntil || null,
                    warranty_applicable: Boolean(item.warrantyApplicable),
                }
                if (item.id) base.id = item.id
                if (item.warrantyApplicable) {
                    base.warranty = mapWarrantyForApi(item.warranty)
                }
                return base
            }),
        purchase_level_warranty: source.purchaseLevelWarranty?.enabled
            ? mapWarrantyForApi(source.purchaseLevelWarranty?.warranty)
            : null,
        document_id: source.documentId || null,
    }

    return payload
}

export function validateTotals(form) {
    const purchase = form?.purchase ?? {}
    const items = Array.isArray(form?.lineItems) ? form.lineItems : []
    const subtotal = sumLineTotals(items)
    const tax = parseMoney(purchase.tax)
    const tip = parseMoney(purchase.tip)
    const discount = parseMoney(purchase.discount)
    const total = parseMoney(purchase.total)
    const expected = subtotal + tax + tip - discount
    const difference = expected - total
    return {
        matches: Math.abs(difference) <= 0.51,
        difference,
        expected,
        total,
    }
}

function extractReceiptId(response) {
    if (!response) return null
    if (response.data && (response.data.id || response.data?.data?.id)) {
        return response.data.id ?? response.data?.data?.id
    }
    return response?.data?.data?.id ?? response?.data?.id ?? response?.id ?? null
}

export function useCreateReceipt(options = {}) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (formState) => {
            const payload = formToApi(formState)
            const result = await createReceipt(payload)
            return { response: result, payload }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
            queryClient.invalidateQueries({ queryKey: ['receipts'] })
            const receiptId = extractReceiptId(data?.response) ?? data?.response?.data?.id
            if (receiptId) {
                queryClient.invalidateQueries({ queryKey: ['receipt', receiptId] })
            }
            options?.onSuccess?.(data?.response, variables, receiptId)
        },
        onError: (error) => {
            options?.onError?.(error)
        },
    })
}

export function useUpdateReceipt(id, options = {}) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (formState) => {
            const payload = formToApi(formState)
            const result = await updateReceipt(id, payload)
            return { response: result, payload }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
            queryClient.invalidateQueries({ queryKey: ['receipts'] })
            if (id) {
                queryClient.invalidateQueries({ queryKey: ['receipt', id] })
            }
            options?.onSuccess?.(data?.response, variables, id)
        },
        onError: (error) => {
            options?.onError?.(error)
        },
    })
}

export function useReceiptFormDefaults(initialDetail) {
    return useMemo(() => detailToForm(initialDetail), [initialDetail])
}

export const receiptFormTemplates = {
    emptyLineItem,
    emptyWarranty,
    baseForm,
}
