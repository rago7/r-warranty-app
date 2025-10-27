import { Link } from 'react-router-dom'
import { formatDate } from '../../../lib/date'
import { formatMoney } from '../../../lib/currency'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

function WarrantyStatusBadge({ status }) {
    const map = {
        in_warranty: 'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))] border-[rgb(var(--success)/0.4)]',
        expired: 'bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] border-[rgb(var(--danger)/0.4)]',
        unknown: 'bg-[rgb(var(--muted-fg)/0.12)] text-[rgb(var(--muted-fg))] border-[rgb(var(--border))]',
    }
    const label = status?.replace('_', ' ') || 'unknown'
    const cls = map[status] || map.unknown
    return <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs capitalize ${cls}`}>{label}</span>
}

function ExtractStatusBadge({ status }) {
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

export default function ReceiptCard({ receipt }) {
    const { prefs } = usePrefs()
    const amount =
        receipt?.totalAmount != null
            ? receipt.totalAmount
            : receipt?.totalCents != null
                ? receipt.totalCents / 100
                : null

    const purchaseLabel = receipt?.purchaseAt
        ? formatDate(receipt.purchaseAt, { timeZone: prefs.timezone, locale: prefs.locale })
        : 'Unknown date'

    return (
        <Link
            to={`/receipts/${receipt.receiptId ?? receipt.id}`}
            className="card overflow-hidden transition-colors hover:bg-[rgb(var(--surface-hover))]"
        >
            <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-[1.25rem] py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-[rgb(var(--fg))]">
                            {receipt?.merchant || 'Unknown merchant'}
                        </h3>
                        <p className="truncate text-xs text-[rgb(var(--muted-fg))]">Purchased {purchaseLabel}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <WarrantyStatusBadge status={receipt?.warrantyStatus} />
                        <ExtractStatusBadge status={receipt?.extractStatus} />
                    </div>
                </div>
            </div>
            <div className="card-padded grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="text-sm text-[rgb(var(--muted-fg))]">
                    {receipt?.snippet ? (
                        <p className="line-clamp-2 text-[rgb(var(--fg))]">{receipt.snippet}</p>
                    ) : (
                        <div className="space-y-1">
                            {receipt?.purchaseId && (
                                <p className="text-[rgb(var(--fg))]">Purchase #{receipt.purchaseId}</p>
                            )}
                            <p>Receipt #{receipt?.receiptId ?? receipt?.id ?? '—'}</p>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-sm text-[rgb(var(--muted-fg))]">Amount</div>
                    <div className="text-lg font-semibold text-[rgb(var(--fg))]">
                        {amount != null
                            ? formatMoney(amount, prefs.currency || receipt?.currency || 'USD', prefs.locale)
                            : '—'}
                    </div>
                </div>
            </div>
        </Link>
    )
}
