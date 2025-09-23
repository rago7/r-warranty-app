import {useEffect, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {createReceipt, getReceipt, updateReceipt, uploadReceiptAttachment} from '../api'
import Input from '../../../components/forms/Input'
import Select from '../../../components/forms/Select'
import DatePicker from '../../../components/forms/DatePicker'
import Skeleton from '../../../components/feedback/Skeleton'

const CATEGORIES = [{value: 'electronics', label: 'Electronics'}, {
    value: 'appliances', label: 'Appliances'
}, {value: 'tools', label: 'Tools'}, {value: 'furniture', label: 'Furniture'}, {value: 'fashion', label: 'Fashion'},]

const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP'].map((c) => ({value: c, label: c}))

function emptyReceipt() {
    return {
        title: '',
        product_name: '',
        merchant: '',
        purchase_date: '',
        total_amount: '',
        currency: 'USD',
        category: 'electronics',
        tags: [],
        serial_number: '',
        order_number: '',
        warranty: {
            start_date: '', end_date: '', provider: '', policy_ref: '', coverage_notes: '',
        },
    }
}


export default function ReceiptFormPage({mode = 'create'}) {
    const isCreate = mode === 'create'
    const navigate = useNavigate()
    const params = useParams()
    const id = params.id
    const qc = useQueryClient()

    const {data: existing, isLoading: loadingExisting} = useQuery({
        enabled: !isCreate, queryKey: ['receipt', id], queryFn: () => getReceipt(id),
    })

    const [form, setForm] = useState(emptyReceipt())
    const [errors, setErrors] = useState({})
    const [dirty, setDirty] = useState(false)
    const [uploading, setUploading] = useState([]) // [{name, progress}]

    useEffect(() => {
        if (!isCreate && existing) {
            setForm({
                ...emptyReceipt(), ...existing,
                tags: existing.tags || [],
                warranty: {...emptyReceipt().warranty, ...(existing.warranty || {})},
            })
        }
    }, [isCreate, existing])

// Unsaved changes warning on reload
    useEffect(() => {
        const handler = (e) => {
            if (dirty) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [dirty])

    function updateField(path, value) {
        setDirty(true)
        setForm((prev) => {
            const next = {...prev}
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
        mutationFn: (payload) => createReceipt(payload), onSuccess: (created) => {
            setDirty(false)
            qc.invalidateQueries({queryKey: ['receipts']})
            navigate(`/receipts/${created.id}`)
        },
    })

    const updateMut = useMutation({
        mutationFn: ({id, payload}) => updateReceipt(id, payload), onSuccess: (updated) => {
            setDirty(false)
            qc.invalidateQueries({queryKey: ['receipts']})
            qc.invalidateQueries({queryKey: ['receipt', updated.id]})
            navigate(`/receipts/${updated.id}`)
        },
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
        if (isCreate) createMut.mutate(payload); else updateMut.mutate({id, payload})
    }

    async function onUploadFiles(files) {
        if (!id) return // only after save/create
        const list = Array.from(files)
        for (const f of list) {
            // simulate progress locally while the mock request runs
            setUploading((prev) => [...prev, {name: f.name, progress: 10}])
            const tickIndex = uploading.length
            let prog = 10
            const iv = setInterval(() => {
                prog = Math.min(90, prog + 10)
                setUploading((prev) => prev.map((u, i) => i === tickIndex ? {...u, progress: prog} : u))
            }, 120)
            try {
                await uploadReceiptAttachment(id, f)
                // mark 100 and remove after a moment
                setUploading((prev) => prev.map((u, i) => i === tickIndex ? {...u, progress: 100} : u))
                setTimeout(() => setUploading((prev) => prev.filter((_, i) => i !== tickIndex)), 400)
                qc.invalidateQueries({queryKey: ['receipt', id]})
            } finally {
                clearInterval(iv)
            }
        }
    }


    if (!isCreate && loadingExisting) {
        return (<div className="space-y-4">
            <Skeleton className="h-6"/>
            <Skeleton className="h-40"/>
        </div>)
    }

    return (<div className="space-y-4">
        <div className="flex items-center justify-between">
            <Link to="/receipts" className="text-sm text-indigo-700 hover:underline">← Back to receipts</Link>
            {!isCreate && id && (
                <Link to={`/receipts/${id}`} className="text-sm text-slate-700 hover:underline">View detail</Link>)}
        </div>

        <h1 className="text-xl font-bold">{isCreate ? 'Add Receipt' : 'Edit Receipt'}</h1>

        <form onSubmit={onSubmit} className="grid gap-4">
            <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <Input label="Title" placeholder="Optional if product name is set" value={form.title}
                       onChange={(e) => updateField('title', e.target.value)} error={errors.title}/>
                <Input label="Product name" value={form.product_name}
                       onChange={(e) => updateField('product_name', e.target.value)}/>

                <Input label="Merchant" value={form.merchant}
                       onChange={(e) => updateField('merchant', e.target.value)} error={errors.merchant}/>
                <DatePicker label="Purchase date" value={form.purchase_date}
                            onChange={(e) => updateField('purchase_date', e.target.value)}
                            error={errors.purchase_date}/>

                <Input label="Amount" type="number" step="0.01" value={form.total_amount}
                       onChange={(e) => updateField('total_amount', e.target.value)} error={errors.total_amount}/>
                <Select label="Currency" value={form.currency}
                        onChange={(e) => updateField('currency', e.target.value)} options={CURRENCIES}/>

                <Select label="Category" value={form.category}
                        onChange={(e) => updateField('category', e.target.value)} options={CATEGORIES}/>
                <Input label="Tags" placeholder="comma, separated"
                       value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags}
                       onChange={(e) => updateField('tags', e.target.value)}/>

                <Input label="Serial #" value={form.serial_number}
                       onChange={(e) => updateField('serial_number', e.target.value)}/>
                <Input label="Order #" value={form.order_number}
                       onChange={(e) => updateField('order_number', e.target.value)}/>
            </section>

            <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <h2 className="sm:col-span-2 font-semibold">Warranty</h2>
                <DatePicker label="Start date" value={form.warranty.start_date}
                            onChange={(e) => updateField('warranty.start_date', e.target.value)}/>
                <DatePicker label="End date" value={form.warranty.end_date}
                            onChange={(e) => updateField('warranty.end_date', e.target.value)}
                            error={errors.warranty_end}/>
                <Input label="Provider" value={form.warranty.provider}
                       onChange={(e) => updateField('warranty.provider', e.target.value)}/>
                <Input label="Policy ref" value={form.warranty.policy_ref}
                       onChange={(e) => updateField('warranty.policy_ref', e.target.value)}/>
                <Input label="Coverage notes" value={form.warranty.coverage_notes}
                       onChange={(e) => updateField('warranty.coverage_notes', e.target.value)}/>
            </section>

            <div className="flex items-center gap-2">
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                        className="rounded-lg border border-slate-200 bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">
                    {isCreate ? (createMut.isPending ? 'Saving…' : 'Save') : (updateMut.isPending ? 'Saving…' : 'Save changes')}
                </button>
                <Link to={isCreate ? '/receipts' : `/receipts/${id}`}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50">Cancel</Link>
            </div>
        </form>

        {/* Attachments */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Attachments</h2>
            {isCreate ? (<p className="mt-2 text-sm text-slate-600">Save the receipt first, then you can upload
                files.</p>) : (<div className="mt-3 grid gap-3">
                <div className="flex items-center gap-2">
                    <input id="file-input" type="file" multiple onChange={(e) => {
                        onUploadFiles(e.target.files);
                        e.target.value = ''
                    }}/>
                </div>
                {uploading.length > 0 && (<div className="grid gap-2">
                    {uploading.map((u, i) => (<div key={i} className="text-sm text-slate-700">
                        {u.name}
                        <div className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-200">
                            <div className="h-2 bg-indigo-600" style={{width: `${u.progress}%`}}/>
                        </div>
                    </div>))}
                </div>)}
                {existing?.attachments?.length ? (<ul className="text-sm text-slate-700">
                    {existing.attachments.map((f) => (<li key={f.id}
                                                          className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2">
                        <span>{f.filename}</span>
                        <a href={f.url} className="text-indigo-700 hover:underline" target="_blank"
                           rel="noreferrer">Open</a>
                    </li>))}
                </ul>) : (<p className="text-sm text-slate-600">No attachments yet.</p>)}
            </div>)}
        </section>
    </div>)
}