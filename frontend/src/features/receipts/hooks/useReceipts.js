import { useQuery } from '@tanstack/react-query'
import { listReceipts, getReceipt } from '../api'

function normalizeWarrantyStatus(status) {
    if (!status) return 'unknown'
    const value = status.toLowerCase()
    if (value === 'in_warranty' || value === 'expired' || value === 'unknown') return value
    if (value === 'active') return 'in_warranty'
    return 'unknown'
}

function mapListItem(raw) {
    if (!raw) return null

    if (raw.attributes) {
        const attrs = raw.attributes || {}
        const totalCents = Number(attrs.total_cents)
        const totalAmount = Number.isFinite(totalCents) ? totalCents / 100 : attrs.total_amount
        return {
            id: raw.id ?? attrs.receipt_id ?? attrs.id,
            receiptId: raw.id ?? attrs.receipt_id ?? attrs.id,
            purchaseId: attrs.purchase_id ?? null,
            merchant: attrs.merchant ?? 'Unknown merchant',
            purchaseAt: attrs.purchase_at ?? null,
            totalCents: Number.isFinite(totalCents) ? totalCents : null,
            totalAmount: Number.isFinite(totalAmount) ? totalAmount : null,
            currency: attrs.currency ?? 'USD',
            warrantyStatus: normalizeWarrantyStatus(attrs.warranty_status),
            extractStatus: attrs.extract_status ?? 'unknown',
            snippet: attrs.snippet ?? null,
        }
    }

    const totalCents = Number(raw.total_cents)
    const totalAmount =
        Number.isFinite(totalCents) && totalCents > 0 ? totalCents / 100 : Number(raw.total_amount ?? raw.totalAmount)

    return {
        id: raw.id,
        receiptId: raw.id,
        purchaseId: raw.purchase_id ?? raw.purchaseId ?? null,
        merchant: raw.merchant ?? raw.title ?? raw.product_name ?? 'Unknown merchant',
        purchaseAt: raw.purchase_at ?? raw.purchase_date ?? raw.purchaseDate ?? null,
        totalCents: Number.isFinite(totalCents) ? totalCents : null,
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : Number(raw.total_amount ?? 0),
        currency: raw.currency ?? 'USD',
        warrantyStatus: normalizeWarrantyStatus(raw.warranty_status ?? raw.status),
        extractStatus: raw.extract_status ?? raw.status ?? 'unknown',
        snippet: raw.snippet ?? null,
    }
}

function adaptListResponse(raw) {
    if (!raw) {
        return {
            items: [],
            page: 1,
            pageSize: 10,
            total: 0,
            raw,
        }
    }

    if (Array.isArray(raw.data)) {
        const items = raw.data.map(mapListItem).filter(Boolean)
        const page = raw.links?.page ?? raw.meta?.page ?? 1
        const pageSize = raw.links?.page_size ?? raw.meta?.page_size ?? items.length
        const total = raw.links?.total ?? raw.meta?.total ?? items.length
        return {
            items,
            page,
            pageSize,
            total,
            raw,
        }
    }

    if (Array.isArray(raw.items)) {
        const items = raw.items.map(mapListItem).filter(Boolean)
        const page = raw.page ?? 1
        const pageSize = raw.page_size ?? items.length
        const total = raw.total ?? items.length
        return {
            items,
            page,
            pageSize,
            total,
            raw,
        }
    }

    return {
        items: [],
        page: 1,
        pageSize: 10,
        total: 0,
        raw,
    }
}

function mapLineItem(item) {
    if (!item) return null
    if (item && typeof item === 'object') {
        const unitPrice = Number(item.unit_price_cents ?? item.unit_price)
        const lineTotal = Number(item.line_total_cents ?? item.line_total)
        return {
            id: item.id ?? null,
            name: item.name ?? item.title ?? 'Item',
            quantity: item.quantity ?? 1,
            unitPriceCents: Number.isFinite(unitPrice) ? unitPrice : null,
            lineTotalCents: Number.isFinite(lineTotal) ? lineTotal : null,
            categoryId: item.category_id ?? null,
            returnableUntil: item.returnable_until ?? null,
            warrantyApplicable: Boolean(item.warranty_applicable),
        }
    }
    return null
}

function mapWarranty(warranty) {
    if (!warranty) return null
    return {
        id: warranty.id ?? null,
        type: warranty.type ?? 'manufacturer',
        endDate: warranty.end_date ?? warranty.endDate ?? null,
        provider: warranty.provider ?? null,
        level: warranty.level ?? 'item',
    }
}

function mapReceiptDetail(raw) {
    if (!raw) {
        return {
            purchase: {},
            merchant: {},
            lineItems: [],
            warranties: [],
            receipt: {},
            documentId: null,
            raw,
        }
    }

    if (raw.data && raw.data.attributes) {
        const attrs = raw.data.attributes
        const purchase = attrs.purchase || {}
        return {
            purchase: {
                subtotalCents: purchase.subtotal_cents != null ? Number(purchase.subtotal_cents) : null,
                taxCents: purchase.tax_cents != null ? Number(purchase.tax_cents) : null,
                tipCents: purchase.tip_cents != null ? Number(purchase.tip_cents) : null,
                discountCents: purchase.discount_cents != null ? Number(purchase.discount_cents) : null,
                totalCents: purchase.total_cents != null ? Number(purchase.total_cents) : null,
                currency: purchase.currency ?? 'USD',
                paymentMethodType: purchase.payment_method_type ?? null,
                status: purchase.status ?? null,
                purchaseAt: purchase.purchase_at ?? null,
                postedAt: purchase.posted_at ?? null,
            },
            merchant: {
                name: attrs.merchant?.name ?? 'Unknown merchant',
                locationText: attrs.merchant?.location_text ?? null,
            },
            lineItems: Array.isArray(attrs.line_items)
                ? attrs.line_items.map(mapLineItem).filter(Boolean)
                : [],
            warranties: Array.isArray(attrs.warranties)
                ? attrs.warranties.map(mapWarranty).filter(Boolean)
                : [],
            receipt: {
                id: attrs.receipt?.id ?? raw.data.id ?? null,
                extractStatus: attrs.receipt?.extract_status ?? 'unknown',
                confidenceScore: attrs.receipt?.confidence_score ?? null,
            },
            documentId: attrs.document_id ?? null,
            raw,
        }
    }

    const totalAmount = Number(raw.total_amount ?? raw.totalAmount ?? 0)
    const totalCents = Number.isFinite(totalAmount) ? Math.round(totalAmount * 100) : null

    return {
        purchase: {
            subtotalCents: totalCents,
            taxCents: null,
            tipCents: null,
            discountCents: null,
            totalCents,
            currency: raw.currency ?? 'USD',
            paymentMethodType: null,
            status: raw.status ?? null,
            purchaseAt: raw.purchase_date ?? raw.purchaseDate ?? null,
            postedAt: null,
        },
        merchant: {
            name: raw.merchant ?? raw.title ?? 'Unknown merchant',
            locationText: null,
        },
        lineItems: [],
        warranties: raw.warranty
            ? [
                  mapWarranty({
                      id: raw.warranty.id ?? `${raw.id}-w`,
                      type: raw.warranty.type ?? 'manufacturer',
                      end_date: raw.warranty.end_date,
                      provider: raw.warranty.provider,
                      level: raw.warranty.level ?? 'purchase',
                  }),
              ].filter(Boolean)
            : [],
        receipt: {
            id: raw.id ?? null,
            extractStatus: raw.extract_status ?? raw.status ?? 'unknown',
            confidenceScore: raw.confidence_score ?? null,
        },
        documentId: raw.document_id ?? null,
        raw,
    }
}

export function useReceipts(filters) {
    return useQuery({
        queryKey: ['receipts', filters],
        queryFn: () => listReceipts(filters),
        keepPreviousData: true,
        select: adaptListResponse,
    })
}

export function useReceipt(id) {
    return useQuery({
        queryKey: ['receipt', id],
        queryFn: () => getReceipt(id),
        enabled: Boolean(id),
        select: mapReceiptDetail,
    })
}
