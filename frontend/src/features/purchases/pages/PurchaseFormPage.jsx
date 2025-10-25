import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPurchase, getPurchase, updatePurchase, uploadPurchaseAttachment } from '../api'
import Input from '../../../components/forms/Input'
import Select from '../../../components/forms/Select'
import DatePicker from '../../../components/forms/DatePicker'
import Skeleton from '../../../components/feedback/Skeleton'
import { useToast } from '../../../app/providers/ToastProvider.jsx'
import useTitle from '../../../lib/useTitle'
import ConfirmDialog from '../../../components/feedback/ConfirmDialog.jsx'
import LineItemsEditor from '../components/LineItemsEditor'

const CATEGORIES = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'tools', label: 'Tools' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'fashion', label: 'Fashion' },
]

const CURRENCIES = [ 'USD', 'EUR', 'INR', 'GBP' ].map((c) => ({ value: c, label: c }))

function emptyPurchase() {
    return {
        title: '',
        product_name: '',
        merchant: '',
        purchase_date: '',
        purchase_time: '',
        total_amount: '',
        currency: 'USD',
        purchase_category: 'electronics',
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
        line_items: [],
    }
}

export default function PurchaseFormPage({ mode = 'create' }) {
    useTitle(mode === 'create' ? 'Add Purchase' : 'Edit Purchase')
    const { toast } = useToast()
    const isCreate = mode === 'create'
    const navigate = useNavigate()
    const params = useParams()
    const id = params.id
    const qc = useQueryClient()

    const { data: existing, isLoading: loadingExisting } = useQuery({
        enabled: !isCreate,
        queryKey: ['purchase', id],
        queryFn: () => getPurchase(id),
    })

    const [form, setForm] = useState(emptyPurchase())
    const [errors, setErrors] = useState({})
    const [dirty, setDirty] = useState(false)

    const [showTimeConfirm, setShowTimeConfirm] = useState(false)
    const [pendingPayload, setPendingPayload] = useState(null)

    useEffect(() => {
        if (!isCreate && existing) {
            setForm({
                ...emptyPurchase(),
                ...existing,
                purchase_time: '',
                tags: existing.tags || [],
                warranty: { ...emptyPurchase().warranty, ...(existing.warranty || {}) },
                line_items: existing.line_items || existing.items || [],
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

    const createMut = useMutation({
        mutationFn: (payload) => createPurchase(payload),
        onSuccess: (created) => {
            setDirty(false)
            qc.invalidateQueries({ queryKey: ['purchases'] })
            toast({ title: 'Purchase created', description: created.title || created.product_name, variant: 'success' })
            navigate(`/purchases/${created.id}`)
        },
        onError: (e) => toast({ title: 'Failed to create', description: e?.message || 'Unknown error', variant: 'error' })
    })

    const updateMut = useMutation({
        mutationFn: ({ id, payload }) => updatePurchase(id, payload),
        onSuccess: (updated) => {
            setDirty(false)
            qc.invalidateQueries({ queryKey: ['purchases'] })
            qc.invalidateQueries({ queryKey: ['purchase', updated.id] })
            toast({ title: 'Changes saved', description: updated.title || updated.product_name, variant: 'success' })
            navigate(`/purchases/${updated.id}`)
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

        if (form.purchase_time) {
            try {
                const time = form.purchase_time.length === 5 ? `${form.purchase_time}:00` : form.purchase_time
                const iso = new Date(`${form.purchase_date}T${time}`).toISOString()
                payload.purchase_time = iso
            } catch {}
        }

        if (!form.purchase_time) {
            if (isCreate) {
                setPendingPayload({ type: 'create', payload })
                setShowTimeConfirm(true)
                return
            } else if (!existing?.purchase_time) {
                setPendingPayload({ type: 'update', payload })
                setShowTimeConfirm(true)
                return
            }
        }

        if (isCreate) createMut.mutate(payload)
        else updateMut.mutate({ id, payload })
    }

    async function onUploadFiles(files) {
        if (!id) return
        const list = Array.from(files)
        for (const f of list) {
            try {
                await uploadPurchaseAttachment(id, f)
                qc.invalidateQueries({ queryKey: ['purchase', id] })
                toast({ title: 'Uploaded', description: f.name, variant: 'success' })
            } catch (e) {
                toast({ title: 'Upload failed', description: e?.message || 'Unknown error', variant: 'error' })
            }
        }
    }

    // line items handler (keeps in form state)
    function setLineItems(items) {
        setDirty(true)
        setForm((prev) => ({ ...prev, line_items: items }))
    }

    const subtotal = (form.line_items || []).reduce((s, it) => s + Number(it.line_total || 0), 0)
    const subtotalMismatch = Math.abs(subtotal - Number(form.total_amount || 0)) > 0.5

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
                <Link to="/purchases" className="text-sm text-indigo-700 hover:underline">← Back to purchases</Link>
                {!isCreate && id && (
                    <Link to={`/purchases/${id}`} className="text-sm text-slate-700 hover:underline">View detail</Link>
                )}
            </div>

            <h1 className="text-xl font-bold">{isCreate ? 'Add Purchase' : 'Edit Purchase'}</h1>

            <form onSubmit={onSubmit} className="grid gap-4">
                <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                    <Input label="Title" placeholder="Optional if product name is set" value={form.title} onChange={(e) => updateField('title', e.target.value)} error={errors.title} />
                    <Input label="Product name" value={form.product_name} onChange={(e) => updateField('product_name', e.target.value)} />

                    <Input label="Merchant" value={form.merchant} onChange={(e) => updateField('merchant', e.target.value)} error={errors.merchant} />
                    <DatePicker label="Purchase date" value={form.purchase_date} onChange={(e) => updateField('purchase_date', e.target.value)} error={errors.purchase_date} />
                    <Input label="Purchase time" type="time" value={form.purchase_time || ''} onChange={(e) => updateField('purchase_time', e.target.value)} hint="Optional" />

                    <Input label="Amount" type="number" step="0.01" value={form.total_amount} onChange={(e) => updateField('total_amount', e.target.value)} error={errors.total_amount} />
                    <Select label="Currency" value={form.currency} onChange={(e) => updateField('currency', e.target.value)} options={CURRENCIES} />

                    <Select label="Category" value={form.purchase_category} onChange={(e) => updateField('purchase_category', e.target.value)} options={CATEGORIES} />
                    <Input label="Tags" placeholder="comma, separated" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={(e) => updateField('tags', e.target.value)} />

                    <Input label="Serial #" value={form.serial_number} onChange={(e) => updateField('serial_number', e.target.value)} />
                    <Input label="Order #" value={form.order_number} onChange={(e) => updateField('order_number', e.target.value)} />
                </section>

                {/* Line items editor */}
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <LineItemsEditor value={form.line_items} onChange={setLineItems} purchaseId={isCreate ? null : id} />
                    {subtotalMismatch && (
                        <div className="mt-3 rounded-md border border-[rgb(var(--danger)/0.3)] bg-[rgb(var(--danger)/0.06)] p-3 text-sm text-[rgb(var(--danger))]">
                            Sum of line items ({subtotal.toFixed(2)}) does not match total amount ({Number(form.total_amount || 0).toFixed(2)}). Please verify totals.
                        </div>
                    )}
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
                    <Link to={isCreate ? '/purchases' : `/purchases/${id}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50">Cancel</Link>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="font-semibold">Attachments</h2>
                    {isCreate ? (
                        <p className="mt-2 text-sm text-slate-600">Save the purchase first, then you can upload files.</p>
                    ) : (
                        <div className="mt-3 grid gap-3">
                            <div className="flex items-center gap-2">
                                <input id="file-input" type="file" multiple onChange={(e) => { onUploadFiles(e.target.files); e.target.value = '' }} />
                            </div>
                        </div>
                    )}
                </section>
            </form>

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
