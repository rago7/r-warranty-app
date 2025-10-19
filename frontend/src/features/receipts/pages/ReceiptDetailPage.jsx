import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getReceipt, deleteReceipt } from '../api'
import Skeleton from '../../../components/feedback/Skeleton'
import { formatDate } from '../../../lib/date'
import { formatMoney } from '../../../lib/currency'
import { warrantyInfo } from '../../../lib/warranty'
import AttachmentItem from '../components/AttachmentItem'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'
import useTitle from '../../../lib/useTitle'
import ConfirmDialog from '../../../components/feedback/ConfirmDialog.jsx'
import { useToast } from '../../../app/providers/ToastProvider.jsx'

function StatusBadge({ status }) {
    const map = {
        in_warranty: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        expired: 'bg-rose-50 text-rose-700 border-rose-200',
        unknown: 'bg-slate-50 text-slate-700 border-slate-200',
    }
    const cls = map[status] || map.unknown
    const label = status?.replace('_', ' ') || 'unknown'
    return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${cls}`}>{label}</span>
}

export default function ReceiptDetailPage() {
    const { prefs } = usePrefs()
    const { toast } = useToast()
    const navigate = useNavigate()
    const { id } = useParams()
    const qc = useQueryClient()

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['receipt', id],
        queryFn: () => getReceipt(id),
    })

    useTitle(data?.title || data?.product_name ? `${data.title || data.product_name}` : 'Receipt')

    const [showConfirm, setShowConfirm] = useState(false)

    const delMut = useMutation({
        mutationFn: () => deleteReceipt(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['receipts'] })
            toast({ title: 'Receipt deleted', variant: 'success' })
            navigate('/receipts')
        },
        onError: (e) => toast({ title: 'Delete failed', description: e?.message || 'Unknown error', variant: 'error' }),
    })

    if (isLoading) return <DetailSkeleton />
    if (isError) {
        const message = error?.response?.status === 404 ? 'Receipt not found' : (error?.message || 'Failed to load receipt')
        return (
            <div>
                <BackLink />
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">{message}</div>
            </div>
        )
    }

    const r = data
    const w = warrantyInfo(r)

    return (
        <div className="space-y-5">
            {/* Action bar has its own stacking context so clicks are never blocked */}
            <div className="relative z-10 isolate flex items-center justify-between">
                <BackLink />
                <div className="flex gap-2">
                    <Link
                        to={`/receipts/${id}/edit`}
                        className="btn btn-outline btn-sm"
                    >
                        Edit
                    </Link>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowConfirm(true)
                        }}
                        className="btn btn-danger btn-sm cursor-pointer"
                    >
                        Delete
                    </button>
                </div>
            </div>

            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-xl font-bold">{r.title || r.product_name}</h1>
                    <div className="mt-1 text-sm text-slate-600">
                        <span>{r.merchant}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(r.purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}</span>
                        {r.category ? (
                            <>
                                <span className="mx-2">•</span>
                                <span className="capitalize">{r.category}</span>
                            </>
                        ) : null}
                    </div>
                    {r.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {r.tags.map((t) => (
                                <span key={t} className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                  {t}
                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500">Amount</div>
                    <div className="text-xl font-semibold">
                        {formatMoney(r.total_amount, prefs.currency || r.currency, prefs.locale)}
                    </div>
                </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
                    <h2 className="font-semibold">Warranty</h2>
                    <div className="mt-2 flex items-center gap-3">
                        <StatusBadge status={w.status} />
                        <span className="text-sm text-slate-700">{w.label}</span>
                    </div>
                    {r.warranty?.provider || r.warranty?.policy_ref || r.warranty?.coverage_notes ? (
                        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                            {r.warranty?.provider && (
                                <div>
                                    <dt className="text-slate-500">Provider</dt>
                                    <dd className="font-medium">{r.warranty.provider}</dd>
                                </div>
                            )}
                            {r.warranty?.policy_ref && (
                                <div>
                                    <dt className="text-slate-500">Policy Ref</dt>
                                    <dd className="font-medium">{r.warranty.policy_ref}</dd>
                                </div>
                            )}
                            {r.warranty?.coverage_notes && (
                                <div className="sm:col-span-2">
                                    <dt className="text-slate-500">Coverage</dt>
                                    <dd className="font-medium">{r.warranty.coverage_notes}</dd>
                                </div>
                            )}
                        </dl>
                    ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="font-semibold">Purchase</h2>
                    <dl className="mt-2 grid grid-cols-1 gap-2 text-sm">
                        <div>
                            <dt className="text-slate-500">Date</dt>
                            <dd className="font-medium">
                                {formatDate(r.purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}
                            </dd>
                        </div>
                        {r.serial_number && (
                            <div>
                                <dt className="text-slate-500">Serial #</dt>
                                <dd className="font-medium">{r.serial_number}</dd>
                            </div>
                        )}
                        {r.order_number && (
                            <div>
                                <dt className="text-slate-500">Order #</dt>
                                <dd className="font-medium">{r.order_number}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Attachments</h2>
                {r.attachments?.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {r.attachments.map((f) => (
                            <AttachmentItem key={f.id} file={f} />
                        ))}
                    </div>
                ) : (
                    <p className="mt-2 text-sm text-slate-600">No attachments yet.</p>
                )}
            </section>

            <ConfirmDialog
                open={showConfirm}
                title="Delete receipt?"
                description="This action cannot be undone. The receipt and its attachments will be removed."
                confirmText="Delete"
                onCancel={() => setShowConfirm(false)}
                onConfirm={() => {
                    setShowConfirm(false)
                    delMut.mutate()
                }}
                loading={delMut.isPending}
            />
        </div>
    )
}

function BackLink() {
    return (
        <Link to="/receipts" className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:underline">
            ← Back to receipts
        </Link>
    )
}

function DetailSkeleton() {
    return (
        <div className="space-y-5">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="h-40 animate-pulse rounded bg-slate-200 sm:col-span-2" />
                <div className="h-40 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-40 animate-pulse rounded bg-slate-200" />
        </div>
    )
}
