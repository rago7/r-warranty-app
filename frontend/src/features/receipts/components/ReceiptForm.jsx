import { useEffect, useMemo, useState } from 'react'
import Input from '../../../components/forms/Input'
import Select from '../../../components/forms/Select'
import DatePicker from '../../../components/forms/DatePicker'
import { useToast } from '../../../app/providers/ToastProvider.jsx'
import {
    useCreateReceipt,
    useUpdateReceipt,
    useReceiptFormDefaults,
    validateTotals,
    sumLineTotals,
    receiptFormTemplates,
} from '../hooks/useReceiptForm'

const CURRENCY_OPTIONS = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
    { value: 'CAD', label: 'CAD' },
]

const PAYMENT_METHODS = [
    { value: 'card', label: 'Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'store_credit', label: 'Store credit' },
]

const WARRANTY_TYPES = [
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'retailer', label: 'Retailer' },
    { value: 'extended', label: 'Extended' },
]

const CATEGORY_OPTIONS = [
    { value: '', label: 'Uncategorised' },
    { value: 'cat_electronics', label: 'Electronics' },
    { value: 'cat_appliances', label: 'Appliances' },
    { value: 'cat_home', label: 'Home & Garden' },
    { value: 'cat_furniture', label: 'Furniture' },
    { value: 'cat_services', label: 'Services' },
]

const MERCHANT_OPTIONS = [
    { value: '', label: 'Select merchant…' },
    { value: 'mrc_apple', label: 'Apple Store' },
    { value: 'mrc_best_buy', label: 'Best Buy' },
    { value: 'mrc_home_depot', label: 'Home Depot' },
    { value: 'mrc_williams_sonoma', label: 'Williams Sonoma' },
    { value: 'mrc_nike', label: 'Nike Store' },
    { value: 'mrc_target', label: 'Target' },
    { value: 'mrc_generic', label: 'Other merchant' },
]

function formatMoneyInput(value) {
    if (value == null || value === '') return ''
    const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    if (!Number.isFinite(num)) return ''
    return (Math.round(num * 100) / 100).toFixed(2)
}

function parseNumber(value) {
    if (value == null || value === '') return 0
    const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    return Number.isFinite(num) ? num : 0
}

function computeTotals(nextForm) {
    const subtotal = sumLineTotals(nextForm.lineItems)
    const purchase = nextForm.purchase
    const tax = parseNumber(purchase.tax)
    const tip = parseNumber(purchase.tip)
    const discount = parseNumber(purchase.discount)
    const total = subtotal + tax + tip - discount
    return {
        subtotal: subtotal >= 0 ? formatMoneyInput(subtotal) : '0.00',
        total: total >= 0 ? formatMoneyInput(total) : '0.00',
    }
}

function applyWarrantyDefaults(warranty, purchaseDate) {
    const next = { ...warranty }
    if (!next.startDate && purchaseDate) {
        next.startDate = purchaseDate
    }
    if (!next.endDate && purchaseDate) {
        const date = new Date(purchaseDate)
        if (!Number.isNaN(date.getTime())) {
            date.setMonth(date.getMonth() + 12)
            next.endDate = date.toISOString().slice(0, 10)
        }
    }
    return next
}

function WarrantyFields({ prefix, warranty, onChange, errors }) {
    return (
        <div className="grid gap-3 rounded-lg border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
            <Select
                label="Warranty type"
                value={warranty.type}
                onChange={(e) => onChange({ type: e.target.value })}
                options={WARRANTY_TYPES}
                error={errors?.[`${prefix}.type`]}
            />
            <Input
                label="Provider"
                value={warranty.provider}
                onChange={(e) => onChange({ provider: e.target.value })}
            />
            <Input
                label="Policy #"
                value={warranty.policyNumber}
                onChange={(e) => onChange({ policyNumber: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
                <DatePicker
                    label="Start date"
                    value={warranty.startDate}
                    onChange={(e) => onChange({ startDate: e.target.value })}
                    error={errors?.[`${prefix}.startDate`]}
                />
                <DatePicker
                    label="End date"
                    value={warranty.endDate}
                    onChange={(e) => onChange({ endDate: e.target.value })}
                    error={errors?.[`${prefix}.endDate`]}
                />
            </div>
            <Input
                label="Terms URL"
                value={warranty.termsUrl}
                onChange={(e) => onChange({ termsUrl: e.target.value })}
            />
            <label className="grid gap-1 text-sm">
                <span className="font-medium">Coverage notes</span>
                <textarea
                    value={warranty.coverageNotes}
                    onChange={(e) => onChange({ coverageNotes: e.target.value })}
                    className="min-h-[80px] w-full rounded-lg border border-[rgb(var(--border))] bg-white px-3 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
                />
            </label>
            <Input
                label="Warranty document id"
                value={warranty.warrantyDocId}
                onChange={(e) => onChange({ warrantyDocId: e.target.value })}
            />
        </div>
    )
}

export default function ReceiptForm({ mode, initialDetail, onSubmitSuccess, receiptId }) {
    const isCreate = mode === 'create'
    const defaults = useReceiptFormDefaults(initialDetail)
    const [form, setForm] = useState(defaults)
    const [errors, setErrors] = useState({})
    const [serverError, setServerError] = useState('')
    const [dirty, setDirty] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        setForm(defaults)
        setErrors({})
        setServerError('')
        setDirty(false)
    }, [defaults])

    useEffect(() => {
        const handler = (event) => {
            if (dirty) {
                event.preventDefault()
                event.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [dirty])

    const createMutation = useCreateReceipt({
        onSuccess: (response, _variables, id) => {
            const receipt = id || response?.data?.id
            setDirty(false)
            setServerError('')
            toast({ title: 'Receipt saved', variant: 'success' })
            if (receipt && onSubmitSuccess) onSubmitSuccess(receipt)
        },
        onError: (error) => {
            const message = error?.response?.data?.message || error?.message || 'Failed to save receipt'
            setServerError(message)
        },
    })

    const updateMutation = useUpdateReceipt(receiptId, {
        onSuccess: (response) => {
            setDirty(false)
            setServerError('')
            toast({ title: 'Changes saved', variant: 'success' })
            if (onSubmitSuccess) onSubmitSuccess(receiptId || response?.data?.id)
        },
        onError: (error) => {
            const message = error?.response?.data?.message || error?.message || 'Failed to save receipt'
            setServerError(message)
        },
    })

    const isSubmitting = isCreate ? createMutation.isPending : updateMutation.isPending

    const totalsCheck = useMemo(() => validateTotals(form), [form])

    function updatePurchaseField(field, value) {
        setDirty(true)
        setForm((prev) => {
            const next = { ...prev, purchase: { ...prev.purchase, [field]: value } }
            if (['tax', 'tip', 'discount'].includes(field)) {
                const recalculated = computeTotals(next)
                next.purchase.total = recalculated.total
                next.purchase.subtotal = recalculated.subtotal
            }
            if (field === 'subtotal') {
                next.purchase.subtotal = formatMoneyInput(value)
            }
            if (field === 'total') {
                next.purchase.total = formatMoneyInput(value)
            }
            return next
        })
    }

    function updateLineItem(index, patch, { recalc = true } = {}) {
        setDirty(true)
        setForm((prev) => {
            const items = prev.lineItems.map((item, idx) => {
                if (idx !== index) return item
                const nextItem = { ...item, ...patch }
                if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
                    const qty = Number.isFinite(Number(nextItem.quantity)) ? Number(nextItem.quantity) : 0
                    const unit = parseNumber(nextItem.unitPrice)
                    nextItem.lineTotal = formatMoneyInput(qty * unit)
                }
                return nextItem
            })
            const next = { ...prev, lineItems: items }
            if (recalc) {
                const recalculated = computeTotals(next)
                next.purchase.subtotal = recalculated.subtotal
                next.purchase.total = recalculated.total
            }
            return next
        })
    }

    function addLineItem() {
        setDirty(true)
        setForm((prev) => ({
            ...prev,
            lineItems: [...prev.lineItems, receiptFormTemplates.emptyLineItem()],
        }))
    }

    function removeLineItem(index) {
        setDirty(true)
        setForm((prev) => {
            if (prev.lineItems.length <= 1) return prev
            const items = prev.lineItems.filter((_, idx) => idx !== index)
            const next = { ...prev, lineItems: items }
            const recalculated = computeTotals(next)
            next.purchase.subtotal = recalculated.subtotal
            next.purchase.total = recalculated.total
            return next
        })
    }

    function updatePurchaseWarranty(enabled) {
        setDirty(true)
        setForm((prev) => ({
            ...prev,
            purchaseLevelWarranty: {
                enabled,
                warranty: enabled
                    ? applyWarrantyDefaults(
                          { ...prev.purchaseLevelWarranty.warranty },
                          prev.purchase.purchaseDate,
                      )
                    : receiptFormTemplates.emptyWarranty(),
            },
        }))
    }

    function updatePurchaseWarrantyFields(patch) {
        setDirty(true)
        setForm((prev) => ({
            ...prev,
            purchaseLevelWarranty: {
                ...prev.purchaseLevelWarranty,
                warranty: { ...prev.purchaseLevelWarranty.warranty, ...patch },
            },
        }))
    }

    function validateForm() {
        const nextErrors = {}
        if (!form.purchase.merchantId) nextErrors['purchase.merchantId'] = 'Merchant is required'
        if (!form.purchase.purchaseDate) nextErrors['purchase.purchaseDate'] = 'Purchase date is required'
        if (!form.purchase.currency) nextErrors['purchase.currency'] = 'Currency required'
        const items = form.lineItems || []
        if (items.length === 0) {
            nextErrors['lineItems'] = 'At least one line item is required'
        }
        items.forEach((item, index) => {
            if (!item.name) nextErrors[`lineItems.${index}.name`] = 'Name required'
            const quantity = Number(item.quantity)
            if (!Number.isFinite(quantity) || quantity <= 0) {
                nextErrors[`lineItems.${index}.quantity`] = 'Qty must be ≥ 1'
            }
            const unit = parseNumber(item.unitPrice)
            if (unit < 0) nextErrors[`lineItems.${index}.unitPrice`] = 'Unit must be ≥ 0'
            if (item.returnableUntil && form.purchase.purchaseDate && item.returnableUntil < form.purchase.purchaseDate) {
                nextErrors[`lineItems.${index}.returnableUntil`] = 'Return date must be after purchase'
            }
            if (item.warrantyApplicable) {
                const w = item.warranty || {}
                if (!w.type) nextErrors[`lineItems.${index}.warranty.type`] = 'Type required'
                if (w.endDate && w.startDate && w.endDate < w.startDate) {
                    nextErrors[`lineItems.${index}.warranty.endDate`] = 'End must be after start'
                }
            }
        })
        if (form.purchaseLevelWarranty.enabled) {
            const w = form.purchaseLevelWarranty.warranty
            if (!w.type) nextErrors['purchaseWarranty.type'] = 'Type required'
            if (w.endDate && w.startDate && w.endDate < w.startDate) {
                nextErrors['purchaseWarranty.endDate'] = 'End must be after start'
            }
        }
        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    function handleSubmit(event) {
        event.preventDefault()
        setServerError('')
        if (!validateForm()) return
        if (!totalsCheck.matches) {
            toast({
                title: 'Total mismatch',
                description: 'Line items and adjustments do not match the total.',
                variant: 'warning',
            })
        }
        if (isCreate) {
            createMutation.mutate(form)
        } else {
            updateMutation.mutate(form)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-6">
            <section className="grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                <h2 className="text-lg font-semibold">Purchase details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                        label="Merchant"
                        options={MERCHANT_OPTIONS}
                        value={form.purchase.merchantId}
                        onChange={(e) => updatePurchaseField('merchantId', e.target.value)}
                        error={errors['purchase.merchantId']}
                    />
                    <Input
                        label="Merchant name"
                        value={form.purchase.merchantName}
                        onChange={(e) => updatePurchaseField('merchantName', e.target.value)}
                        hint="Optional if merchant lookup is unavailable"
                    />
                    <DatePicker
                        label="Purchase date"
                        value={form.purchase.purchaseDate}
                        onChange={(e) => updatePurchaseField('purchaseDate', e.target.value)}
                        error={errors['purchase.purchaseDate']}
                    />
                    <Input
                        label="Purchase time"
                        type="time"
                        value={form.purchase.purchaseTime}
                        onChange={(e) => updatePurchaseField('purchaseTime', e.target.value)}
                        hint="Optional"
                    />
                    <Select
                        label="Currency"
                        value={form.purchase.currency}
                        options={CURRENCY_OPTIONS}
                        onChange={(e) => updatePurchaseField('currency', e.target.value)}
                        error={errors['purchase.currency']}
                    />
                    <Select
                        label="Payment method"
                        value={form.purchase.paymentMethodType}
                        options={PAYMENT_METHODS}
                        onChange={(e) => updatePurchaseField('paymentMethodType', e.target.value)}
                    />
                </div>
                <label className="grid gap-1 text-sm">
                    <span className="font-medium">Notes</span>
                    <textarea
                        value={form.purchase.notes}
                        onChange={(e) => updatePurchaseField('notes', e.target.value)}
                        className="min-h-[80px] w-full rounded-lg border border-[rgb(var(--border))] bg-white px-3 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
                    />
                </label>
            </section>

            <section className="grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                <h2 className="text-lg font-semibold">Amounts</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Input
                        label="Subtotal"
                        type="number"
                        step="0.01"
                        value={form.purchase.subtotal}
                        onChange={(e) => updatePurchaseField('subtotal', e.target.value)}
                    />
                    <Input
                        label="Tax"
                        type="number"
                        step="0.01"
                        value={form.purchase.tax}
                        onChange={(e) => updatePurchaseField('tax', e.target.value)}
                    />
                    <Input
                        label="Tip"
                        type="number"
                        step="0.01"
                        value={form.purchase.tip}
                        onChange={(e) => updatePurchaseField('tip', e.target.value)}
                    />
                    <Input
                        label="Discount"
                        type="number"
                        step="0.01"
                        value={form.purchase.discount}
                        onChange={(e) => updatePurchaseField('discount', e.target.value)}
                    />
                    <Input
                        label="Total"
                        type="number"
                        step="0.01"
                        value={form.purchase.total}
                        onChange={(e) => updatePurchaseField('total', e.target.value)}
                        error={!totalsCheck.matches ? 'Does not match line items' : undefined}
                    />
                </div>
                {!totalsCheck.matches && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Totals differ by {formatMoneyInput(Math.abs(totalsCheck.difference))}. Adjust amounts or items.
                    </div>
                )}
            </section>

            <section className="grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Line items</h2>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addLineItem}>
                        Add item
                    </button>
                </div>
                {errors['lineItems'] && (
                    <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                        {errors['lineItems']}
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[rgb(var(--border))] text-sm">
                        <thead className="bg-[rgb(var(--surface))] text-left text-[rgb(var(--muted-fg))]">
                            <tr>
                                <th className="px-3 py-2 font-medium">Item</th>
                                <th className="px-3 py-2 font-medium">Category</th>
                                <th className="px-3 py-2 font-medium">Qty</th>
                                <th className="px-3 py-2 font-medium">Unit price</th>
                                <th className="px-3 py-2 font-medium">Line total</th>
                                <th className="px-3 py-2 font-medium">Returnable until</th>
                                <th className="px-3 py-2 font-medium">Warranty</th>
                                <th className="px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border))]">
                            {form.lineItems.map((item, index) => (
                                <tr key={item.id || index} className="align-top">
                                    <td className="px-3 py-2">
                                        <Input
                                            label=""
                                            placeholder="Item name"
                                            value={item.name}
                                            onChange={(e) => updateLineItem(index, { name: e.target.value })}
                                            error={errors[`lineItems.${index}.name`]}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Select
                                            label=""
                                            value={item.categoryId}
                                            onChange={(e) => updateLineItem(index, { categoryId: e.target.value }, { recalc: false })}
                                            options={CATEGORY_OPTIONS}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            label=""
                                            type="number"
                                            min={0}
                                            step="1"
                                            value={item.quantity}
                                            onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                                            error={errors[`lineItems.${index}.quantity`]}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            label=""
                                            type="number"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => updateLineItem(index, { unitPrice: e.target.value })}
                                            error={errors[`lineItems.${index}.unitPrice`]}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            label=""
                                            type="number"
                                            step="0.01"
                                            value={item.lineTotal}
                                            onChange={(e) => updateLineItem(index, { lineTotal: e.target.value })}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <DatePicker
                                            label=""
                                            value={item.returnableUntil}
                                            onChange={(e) => updateLineItem(index, { returnableUntil: e.target.value })}
                                            error={errors[`lineItems.${index}.returnableUntil`]}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={item.warrantyApplicable}
                            onChange={(e) => {
                                const checked = e.target.checked
                                setDirty(true)
                                setForm((prev) => {
                                    const items = prev.lineItems.map((existing, idx) => {
                                        if (idx !== index) return existing
                                        const nextItem = { ...existing }
                                        nextItem.warrantyApplicable = checked
                                        nextItem.warranty = checked
                                            ? applyWarrantyDefaults(
                                                  { ...existing.warranty },
                                                  prev.purchase.purchaseDate,
                                              )
                                            : receiptFormTemplates.emptyWarranty()
                                        return nextItem
                                    })
                                    const next = {
                                        ...prev,
                                        lineItems: items,
                                        purchase: { ...prev.purchase },
                                    }
                                    const recalculated = computeTotals(next)
                                    next.purchase.subtotal = recalculated.subtotal
                                    next.purchase.total = recalculated.total
                                    return next
                                })
                            }}
                        />
                        <span>Has warranty</span>
                    </label>
                                            {item.warrantyApplicable && (
                                                <WarrantyFields
                                                    prefix={`lineItems.${index}.warranty`}
                                                    warranty={item.warranty}
                                                    errors={errors}
                                                    onChange={(patch) =>
                                                        updateLineItem(
                                                            index,
                                                            {
                                                                warranty: { ...item.warranty, ...patch },
                                                            },
                                                            { recalc: false },
                                                        )
                                                    }
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => removeLineItem(index)}
                                            disabled={form.lineItems.length <= 1}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Purchase-level warranty</h2>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.purchaseLevelWarranty.enabled}
                            onChange={(e) => updatePurchaseWarranty(e.target.checked)}
                        />
                        <span>Include warranty</span>
                    </label>
                </div>
                {form.purchaseLevelWarranty.enabled && (
                    <WarrantyFields
                        prefix="purchaseWarranty"
                        warranty={form.purchaseLevelWarranty.warranty}
                        errors={errors}
                        onChange={updatePurchaseWarrantyFields}
                    />
                )}
            </section>

            <section className="grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                <h2 className="text-lg font-semibold">Attachments</h2>
                <Input
                    label="Receipt document id"
                    value={form.documentId}
                    onChange={(e) => {
                        setDirty(true)
                        setForm((prev) => ({ ...prev, documentId: e.target.value }))
                    }}
                />
                <p className="text-sm text-[rgb(var(--muted-fg))]">
                    Document IDs are used when requesting a preview. Replace with a new document id after uploading via the
                    attachments panel on the detail page.
                </p>
            </section>

            {serverError && (
                <div className="rounded border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">{serverError}</div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving…' : isCreate ? 'Save receipt' : 'Save changes'}
                </button>
                <span className="text-sm text-[rgb(var(--muted-fg))]">
                    Subtotal from items: {formatMoneyInput(sumLineTotals(form.lineItems))}
                </span>
            </div>
        </form>
    )
}
