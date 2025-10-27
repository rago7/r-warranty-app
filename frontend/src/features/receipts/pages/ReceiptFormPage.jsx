import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createReceipt, getReceipt, updateReceipt, uploadReceiptAttachment } from '../api'
import Input from '../../../components/forms/Input'
import Select from '../../../components/forms/Select'
import DatePicker from '../../../components/forms/DatePicker'
import Skeleton from '../../../components/feedback/Skeleton'
import { useToast } from '../../../app/providers/ToastProvider.jsx'
import useTitle from '../../../lib/useTitle'
import ConfirmDialog from '../../../components/feedback/ConfirmDialog.jsx'

const CATEGORIES = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'tools', label: 'Tools' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'fashion', label: 'Fashion' },
]

const CURRENCIES = [ 'USD', 'EUR', 'INR', 'GBP' ].map((c) => ({ value: c, label: c }))

function emptyReceipt() {
    return {
        title: '',
        product_name: '',
        merchant: '',
        purchase_date: '',
        purchase_time: '',
        total_amount: '',
        currency: 'USD',
        category: 'electronics',
        tags: [],
        serial_number: '',
        order_number: '',
        warranty: {
            start_date: '',
            end_date: '',
            provider: '',
            policy_ref: '',
            coverage_notes: '',
        },
    }
}

function adaptReceiptForForm(raw) {
    if (!raw) return raw
    if (raw.data && raw.data.attributes) {
        const attrs = raw.data.attributes
        const base = emptyReceipt()
        const firstItem = Array.isArray(attrs.line_items) ? attrs.line_items[0] : null
        const firstWarranty = Array.isArray(attrs.warranties) ? attrs.warranties[0] : null
        const purchaseAt = attrs.purchase?.purchase_at ?? ''
        const totalCents = Number(attrs.purchase?.total_cents)
        const totalAmount = Number.isFinite(totalCents) ? (totalCents / 100).toFixed(2) : ''

        return {
            ...base,
            id: raw.data.id ?? base.id,
            title: firstItem?.name || base.title,
            product_name: firstItem?.name || base.product_name,
            merchant: attrs.merchant?.name || base.merchant,
            purchase_date: purchaseAt ? purchaseAt.slice(0, 10) : base.purchase_date,
            purchase_time: '',
            total_amount: totalAmount,
            currency: attrs.purchase?.currency || base.currency,
            category: firstItem?.category_id || base.category,
            tags: base.tags,
            serial_number: base.serial_number,
            order_number: base.order_number,
            warranty: {
                ...base.warranty,
                start_date: firstWarranty?.start_date ?? base.warranty.start_date,
                end_date: firstWarranty?.end_date ?? base.warranty.end_date,
                provider: firstWarranty?.provider ?? base.warranty.provider,
                policy_ref: firstWarranty?.policy_ref ?? base.warranty.policy_ref,
                coverage_notes: firstWarranty?.coverage_notes ?? base.warranty.coverage_notes,
            },
            __original_purchase_time: purchaseAt || null,
        }
    }
    return raw
}

export default function ReceiptFormPage({ mode = 'create' }) {
    useTitle(mode === 'create' ? 'Add Receipt' : 'Edit Receipt')
    const { toast } = useToast()
    const isCreate = mode === 'create'
    const navigate = useNavigate()
    const params = useParams()
    const id = params.id
    const qc = useQueryClient()

    const { data: existing, isLoading: loadingExisting } = useQuery({
        enabled: !isCreate,
        queryKey: ['receipt', id],
        queryFn: () => getReceipt(id),
        select: adaptReceiptForForm,
    })

    const [form, setForm] = useState(emptyReceipt())
    const [errors, setErrors] = useState({})
    const [dirty, setDirty] = useState(false)
    // confirm dialog when purchase_time is missing
    const [showTimeConfirm, setShowTimeConfirm] = useState(false)
    const [pendingPayload, setPendingPayload] = useState(null) // { type: 'create'|'update', payload }

    useEffect(() => {
        if (!isCreate && existing) {
            setForm({
                ...emptyReceipt(),
                ...existing,
                // keep purchase_time input blank on edit; existing value will be preserved unless user sets a new time
                purchase_time: '',
                tags: existing.tags || [],
                warranty: { ...emptyReceipt().warranty, ...(existing.warranty || {}) },
            })
        }
    }, [isCreate, existing])

    useEffect(() => {
        const handler = (e) => {
            if (dirty) { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [dirty])

    function updateField(path, value) {
        setDirty(true)
        setForm((prev) => {
            const next = { ...prev }
            const parts = path.split('.')
            let obj = next
            for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]]
            obj[parts[parts.length - 1]] = value
            return next
        })
    }

    function validate() {
        const e = {}
        if (!form.product_name && !form.title) e.title = 'Title or product name is required'
        if (!form.merchant) e.merchant = 'Merchant is required'
        if (!form.purchase_date) e.purchase_date = 'Purchase date is required'
        if (form.total_amount === '' || isNaN(Number(form.total_amount))) e.total_amount = 'Valid amount required'
        if (form.warranty.start_date && form.warranty.end_date && form.warranty.end_date < form.warranty.start_date) {
            e.warranty_end = 'End date must be after start date'
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const invalidateReceiptsData = () => {
        qc.invalidateQueries({ queryKey: ['receipts'] })
        qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    }

    const createMut = useMutation({
        mutationFn: (payload) => createReceipt(payload),
        onSuccess: (created) => {
            const createdId = created?.data?.id ?? created?.id
            const attributes = created?.data?.attributes ?? {}
            const lineItemName = attributes.line_items?.[0]?.name
            const merchantName = attributes.merchant?.name
            const label = created?.title || created?.product_name || lineItemName || merchantName || 'Receipt'
            setDirty(false)
            invalidateReceiptsData()
            toast({ title: 'Receipt created', description: label, variant: 'success' })
            navigate(`/receipts/${createdId}`)
        },
        onError: (e) => toast({ title: 'Failed to create', description: e?.message || 'Unknown error', variant: 'error' })
    })

    const updateMut = useMutation({
        mutationFn: ({ id, payload }) => updateReceipt(id, payload),
        onSuccess: (updated) => {
            const updatedId = updated?.data?.id ?? updated?.id
            const attributes = updated?.data?.attributes ?? {}
            const lineItemName = attributes.line_items?.[0]?.name
            const merchantName = attributes.merchant?.name
            const label = updated?.title || updated?.product_name || lineItemName || merchantName || 'Receipt'
            setDirty(false)
            invalidateReceiptsData()
            qc.invalidateQueries({ queryKey: ['receipt', updatedId] })
            toast({ title: 'Changes saved', description: label, variant: 'success' })
            navigate(`/receipts/${updatedId}`)
        },
        onError: (e) => toast({ title: 'Failed to save', description: e?.message || 'Unknown error', variant: 'error' })
    })

    async function onSubmit(e) {
        e.preventDefault()
        if (!validate()) return

        const payload = {
            ...form,
            total_amount: Number(form.total_amount),
            tags: Array.isArray(form.tags) ? form.tags : String(form.tags || '')
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
        }

        const { __original_purchase_time, ...cleanPayload } = payload

        // If user provided a purchase time, combine with date into ISO; otherwise, omit
        if (form.purchase_time) {
            try {
                const time = form.purchase_time.length === 5 ? `${form.purchase_time}:00` : form.purchase_time
                const iso = new Date(`${form.purchase_date}T${time}`).toISOString()
                cleanPayload.purchase_time = iso
            } catch {
                // ignore invalid time inputs
            }
        }

        // If purchase time is missing, show confirmation dialog before submitting
        if (!form.purchase_time) {
            if (isCreate) {
                setPendingPayload({ type: 'create', payload: cleanPayload })
                setShowTimeConfirm(true)
                return
            } else if (!existing?.__original_purchase_time) { // only warn on edit if original had no time
                setPendingPayload({ type: 'update', payload: cleanPayload })
                setShowTimeConfirm(true)
                return
            }
        }

        if (isCreate) createMut.mutate(cleanPayload)
        else updateMut.mutate({ id, payload: cleanPayload })
    }

    async function onUploadFiles(files) {
        if (!id) return
        const list = Array.from(files)
        for (const f of list) {
            toast({ title: 'Uploading…', description: f.name })
            try {
                await uploadReceiptAttachment(id, f)
                qc.invalidateQueries({ queryKey: ['receipt', id] })
                qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
                toast({ title: 'Uploaded', description: f.name, variant: 'success' })
            } catch (e) {
                toast({ title: 'Upload failed', description: e?.message || 'Unknown error', variant: 'error' })
            }
        }
    }

    if (!isCreate && loadingExisting) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-6" />
                <Skeleton className="h-40" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Link to="/receipts" className="text-sm text-indigo-700 hover:underline">← Back to receipts</Link>
                {!isCreate && id && (
                    <Link to={`/receipts/${id}`} className="text-sm text-slate-700 hover:underline">View detail</Link>
                )}
            </div>

            <h1 className="text-xl font-bold">{isCreate ? 'Add Receipt' : 'Edit Receipt'}</h1>

            <form onSubmit={onSubmit} className="grid gap-4">
                <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                    <Input label="Title" placeholder="Optional if product name is set" value={form.title} onChange={(e) => updateField('title', e.target.value)} error={errors.title} />
                    <Input label="Product name" value={form.product_name} onChange={(e) => updateField('product_name', e.target.value)} />

                    <Input label="Merchant" value={form.merchant} onChange={(e) => updateField('merchant', e.target.value)} error={errors.merchant} />
                    <DatePicker label="Purchase date" value={form.purchase_date} onChange={(e) => updateField('purchase_date', e.target.value)} error={errors.purchase_date} />
                    <Input label="Purchase time" type="time" value={form.purchase_time || ''} onChange={(e) => updateField('purchase_time', e.target.value)} hint="Optional" />

                    <Input label="Amount" type="number" step="0.01" value={form.total_amount} onChange={(e) => updateField('total_amount', e.target.value)} error={errors.total_amount} />
                    <Select label="Currency" value={form.currency} onChange={(e) => updateField('currency', e.target.value)} options={CURRENCIES} />

                    <Select label="Category" value={form.category} onChange={(e) => updateField('category', e.target.value)} options={CATEGORIES} />
                    <Input label="Tags" placeholder="comma, separated" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={(e) => updateField('tags', e.target.value)} />

                    <Input label="Serial #" value={form.serial_number} onChange={(e) => updateField('serial_number', e.target.value)} />
                    <Input label="Order #" value={form.order_number} onChange={(e) => updateField('order_number', e.target.value)} />
                </section>

                <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                    <h2 className="sm:col-span-2 font-semibold">Warranty</h2>
                    <DatePicker label="Start date" value={form.warranty.start_date} onChange={(e) => updateField('warranty.start_date', e.target.value)} />
                    <DatePicker label="End date" value={form.warranty.end_date} onChange={(e) => updateField('warranty.end_date', e.target.value)} error={errors.warranty_end} />
                    <Input label="Provider" value={form.warranty.provider} onChange={(e) => updateField('warranty.provider', e.target.value)} />
                    <Input label="Policy ref" value={form.warranty.policy_ref} onChange={(e) => updateField('warranty.policy_ref', e.target.value)} />
                    <Input label="Coverage notes" value={form.warranty.coverage_notes} onChange={(e) => updateField('warranty.coverage_notes', e.target.value)} />
                </section>

                <div className="flex items-center gap-2">
                    <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="rounded-lg border border-slate-200 bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">
                        {isCreate ? (createMut.isPending ? 'Saving…' : 'Save') : (updateMut.isPending ? 'Saving…' : 'Save changes')}
                    </button>
                    <Link to={isCreate ? '/receipts' : `/receipts/${id}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50">Cancel</Link>
                </div>
            </form>

            {/* Attachments */}
            <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Attachments</h2>
                {isCreate ? (
                    <p className="mt-2 text-sm text-slate-600">Save the receipt first, then you can upload files.</p>
                ) : (
                    <div className="mt-3 grid gap-3">
                        <div className="flex items-center gap-2">
                            <input id="file-input" type="file" multiple onChange={(e) => { onUploadFiles(e.target.files); e.target.value = '' }} />
                        </div>
                    </div>
                )}
            </section>

            {/* Time missing confirm dialog */}
            <ConfirmDialog
                open={showTimeConfirm}
                title="No purchase time provided"
                description="You didn't provide a purchase time. If you submit now, the current time will be taken as the purchase time by default."
                confirmText={isCreate ? (createMut.isPending ? 'Submitting…' : 'Submit') : (updateMut.isPending ? 'Saving…' : 'Save')}
                cancelText="Continue editing"
                onCancel={() => { setShowTimeConfirm(false); setPendingPayload(null) }}
                onConfirm={() => {
                    const pending = pendingPayload
                    setShowTimeConfirm(false)
                    if (!pending) return
                    if (pending.type === 'create') {
                        createMut.mutate(pending.payload)
                    } else {
                        updateMut.mutate({ id, payload: pending.payload })
                    }
                    setPendingPayload(null)
                }}
            />
        </div>
    )
}
