import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatDate, formatTime } from '../../../lib/date'
import { formatMoney } from '../../../lib/currency'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'
import useTitle from '../../../lib/useTitle'
import ConfirmDialog from '../../../components/feedback/ConfirmDialog.jsx'
import { useToast } from '../../../app/providers/ToastProvider.jsx'
import { deleteReceipt, presignDocument } from '../api'
import { useReceipt } from '../hooks/useReceipts'

function formatCents(value, currency, locale) {
    if (value == null) return '—'
    const cents = Number(value)
    if (!Number.isFinite(cents)) return '—'
    return formatMoney(cents / 100, currency || 'USD', locale)
}

function StatusPill({ status }) {
    const map = {
        success: 'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))] border-[rgb(var(--success)/0.4)]',
        processing: 'bg-[rgb(var(--warning)/0.12)] text-[rgb(var(--warning))] border-[rgb(var(--warning)/0.4)]',
        pending: 'bg-[rgb(var(--muted-fg)/0.12)] text-[rgb(var(--muted-fg))] border-[rgb(var(--border))]',
        failed: 'bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] border-[rgb(var(--danger)/0.4)]',
    }
    const cls = map[status] || map.pending
    const label = status ? status.replace('_', ' ') : 'pending'
    return <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs capitalize ${cls}`}>{label}</span>
}

function WarrantiesSection({ warranties, timezone, locale }) {
    if (!warranties || warranties.length === 0) {
        return <p className="text-sm text-[rgb(var(--muted-fg))]">No warranties captured.</p>
    }
    return (
        <ul className="flex flex-wrap gap-3">
            {warranties.map((w) => (
                <li key={w.id || `${w.type}-${w.endDate}`}
                    className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm">
                    <div className="font-semibold capitalize">{w.type}</div>
                    <div className="text-[rgb(var(--muted-fg))]">
                        {w.provider && <span>{w.provider} • </span>}
                        {w.endDate
                            ? formatDate(w.endDate, { timeZone: timezone, locale })
                            : 'End date unknown'}
                    </div>
                </li>
            ))}
        </ul>
    )
}

function LineItemsTable({ items, currency, locale }) {
    if (!items || items.length === 0) {
        return <p className="text-sm text-[rgb(var(--muted-fg))]">No line items extracted.</p>
    }
    const resolvedCurrency = currency || 'USD'
    return (
        <div className="overflow-hidden rounded-lg border border-[rgb(var(--border))]">
            <table className="min-w-full divide-y divide-[rgb(var(--border))] text-sm">
                <thead className="bg-[rgb(var(--surface))] text-left text-[rgb(var(--muted-fg))]">
                    <tr>
                        <th className="px-4 py-2 font-medium">Item</th>
                        <th className="px-4 py-2 font-medium">Qty</th>
                        <th className="px-4 py-2 font-medium">Unit</th>
                        <th className="px-4 py-2 font-medium">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                    {items.map((item) => {
                        const unit =
                            item.unitPriceCents != null
                                ? formatMoney(item.unitPriceCents / 100, resolvedCurrency, locale)
                                : '—'
                        const total =
                            item.lineTotalCents != null
                                ? formatMoney(item.lineTotalCents / 100, resolvedCurrency, locale)
                                : '—'
                        return (
                            <tr key={item.id || `${item.name}-${item.lineTotalCents}`} className="text-[rgb(var(--fg))]">
                                <td className="px-4 py-2">
                                    <div className="font-medium">{item.name}</div>
                                    {item.categoryId && (
                                        <div className="text-xs text-[rgb(var(--muted-fg))]">Category: {item.categoryId}</div>
                                    )}
                                </td>
                                <td className="px-4 py-2">{item.quantity ?? 1}</td>
                                <td className="px-4 py-2">{unit}</td>
                                <td className="px-4 py-2 text-right">{total}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default function ReceiptDetailPage() {
    const { prefs } = usePrefs()
    const { toast } = useToast()
    const navigate = useNavigate()
    const { id } = useParams()
    const qc = useQueryClient()

    const { data, isLoading, isError, error } = useReceipt(id)

    const merchantName = data?.merchant?.name
    useTitle(merchantName ? `${merchantName} receipt` : 'Receipt')

    const [showConfirm, setShowConfirm] = useState(false)

    const deleteMutation = useMutation({
        mutationFn: () => deleteReceipt(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['receipts'] })
            qc.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
            toast({ title: 'Receipt deleted', variant: 'success' })
            navigate('/receipts')
        },
        onError: (e) => toast({ title: 'Delete failed', description: e?.message || 'Unknown error', variant: 'error' }),
    })

    const previewMutation = useMutation({
        mutationFn: (docId) => presignDocument(docId),
        onSuccess: (payload) => {
            const url =
                payload?.data?.attributes?.url ??
                payload?.attributes?.url ??
                payload?.url ??
                payload?.data?.url ??
                null
            if (url) {
                window.open(url, '_blank', 'noopener')
            } else {
                toast({ title: 'Preview unavailable', description: 'No URL returned for this document.', variant: 'error' })
            }
        },
        onError: (e) => toast({ title: 'Preview failed', description: e?.message || 'Unable to load document', variant: 'error' }),
    })

    if (isLoading) return <DetailSkeleton />

    if (isError) {
        const message =
            error?.response?.status === 404
                ? 'Receipt not found'
                : error?.message || 'Failed to load receipt'
        return (
            <div>
                <BackLink />
                <div className="mt-3 rounded-lg border border-[rgb(var(--danger)/0.3)] bg-[rgb(var(--danger)/0.1)] p-4 text-[rgb(var(--danger))]">
                    {message}
                </div>
            </div>
        )
    }

    const purchase = data?.purchase ?? {}
    const merchant = data?.merchant ?? {}
    const lineItems = data?.lineItems ?? []
    const warranties = data?.warranties ?? []
    const receiptMeta = data?.receipt ?? {}
    const documentId = data?.documentId
    const currency = purchase.currency || prefs.currency || 'USD'

    return (
        <div className="space-y-5">
            <div className="relative z-10 isolate flex flex-wrap items-center justify-between gap-3">
                <BackLink />
                <div className="flex flex-wrap gap-2">
                    {documentId && (
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => previewMutation.mutate(documentId)}
                            disabled={previewMutation.isPending}
                        >
                            {previewMutation.isPending ? 'Loading…' : 'Preview'}
                        </button>
                    )}
                    <Link to={`/receipts/${id}/edit`} className="btn btn-outline btn-sm">
                        Edit
                    </Link>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowConfirm(true)
                        }}
                        className="btn btn-danger btn-sm"
                        disabled={deleteMutation.isPending}
                    >
                        Delete
                    </button>
                </div>
            </div>

            <header className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold">{merchant.name || 'Receipt'}</h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[rgb(var(--muted-fg))]">
                            {merchant.locationText && <span>{merchant.locationText}</span>}
                            {purchase.purchaseAt && (
                                <span>
                                    Purchased {formatDate(purchase.purchaseAt, {
                                        timeZone: prefs.timezone,
                                        locale: prefs.locale,
                                    })}{' '}
                                    {formatTime(purchase.purchaseAt, {
                                        timeZone: prefs.timezone,
                                        locale: prefs.locale,
                                    })}
                                </span>
                            )}
                            {purchase.postedAt && (
                                <span>
                                    Posted {formatDate(purchase.postedAt, {
                                        timeZone: prefs.timezone,
                                        locale: prefs.locale,
                                    })}{' '}
                                    {formatTime(purchase.postedAt, {
                                        timeZone: prefs.timezone,
                                        locale: prefs.locale,
                                    })}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-[rgb(var(--muted-fg))]">Total</div>
                        <div className="text-2xl font-semibold text-[rgb(var(--fg))]">
                            {formatCents(purchase.totalCents, currency, prefs.locale)}
                        </div>
                    </div>
                </div>
            </header>

            <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 lg:col-span-2">
                    <h2 className="font-semibold text-[rgb(var(--fg))]">Purchase summary</h2>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-[rgb(var(--muted-fg))]">Subtotal</dt>
                            <dd className="font-medium text-[rgb(var(--fg))]">
                                {formatCents(purchase.subtotalCents ?? purchase.totalCents, currency, prefs.locale)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[rgb(var(--muted-fg))]">Tax</dt>
                            <dd className="font-medium text-[rgb(var(--fg))]">
                                {formatCents(purchase.taxCents, currency, prefs.locale)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[rgb(var(--muted-fg))]">Tip</dt>
                            <dd className="font-medium text-[rgb(var(--fg))]">
                                {formatCents(purchase.tipCents, currency, prefs.locale)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[rgb(var(--muted-fg))]">Discount</dt>
                            <dd className="font-medium text-[rgb(var(--fg))]">
                                {formatCents(purchase.discountCents, currency, prefs.locale)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[rgb(var(--muted-fg))]">Payment method</dt>
                            <dd className="font-medium text-[rgb(var(--fg))]">
                                {purchase.paymentMethodType ? purchase.paymentMethodType.replace('_', ' ') : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[rgb(var(--muted-fg))]">Status</dt>
                            <dd className="font-medium text-[rgb(var(--fg))]">{purchase.status ?? '—'}</dd>
                        </div>
                    </dl>
                </div>
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                    <h2 className="font-semibold text-[rgb(var(--fg))]">OCR</h2>
                    <div className="mt-2 flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-[rgb(var(--muted-fg))]">Status</span>
                            <StatusPill status={receiptMeta.extractStatus} />
                        </div>
                        {receiptMeta.confidenceScore != null && (
                            <div>
                                <span className="text-[rgb(var(--muted-fg))]">Confidence</span>
                                <span className="ml-2 font-medium text-[rgb(var(--fg))]">
                                    {(receiptMeta.confidenceScore * 100).toFixed(0)}%
                                </span>
                            </div>
                        )}
                        {documentId ? (
                            <p className="text-xs text-[rgb(var(--muted-fg))]">Document ID: {documentId}</p>
                        ) : null}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                <h2 className="font-semibold text-[rgb(var(--fg))]">Line items</h2>
                <div className="mt-3">
                    <LineItemsTable items={lineItems} currency={currency} locale={prefs.locale} />
                </div>
            </section>

            <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                <h2 className="font-semibold text-[rgb(var(--fg))]">Warranties</h2>
                <div className="mt-3">
                    <WarrantiesSection warranties={warranties} timezone={prefs.timezone} locale={prefs.locale} />
                </div>
            </section>

            <ConfirmDialog
                open={showConfirm}
                title="Delete receipt?"
                description="This action cannot be undone. The receipt will be removed."
                confirmText="Delete"
                onCancel={() => setShowConfirm(false)}
                onConfirm={() => {
                    setShowConfirm(false)
                    deleteMutation.mutate()
                }}
                loading={deleteMutation.isPending}
            />
        </div>
    )
}

function BackLink() {
    return (
        <Link to="/receipts" className="inline-flex items-center gap-2 text-sm text-[rgb(var(--primary))] hover:underline">
            ← Back to receipts
        </Link>
    )
}

function DetailSkeleton() {
    return (
        <div className="space-y-5">
            <div className="h-6 w-48 animate-pulse rounded bg-[rgb(var(--border))]" />
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="h-40 animate-pulse rounded bg-[rgb(var(--border))] sm:col-span-2" />
                <div className="h-40 animate-pulse rounded bg-[rgb(var(--border))]" />
            </div>
            <div className="h-40 animate-pulse rounded bg-[rgb(var(--border))]" />
        </div>
    )
}
