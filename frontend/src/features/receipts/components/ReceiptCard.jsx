import { formatDate } from '../../../lib/date'
import { formatMoney } from '../../../lib/currency'
import { Link } from 'react-router-dom'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

function StatusBadge({ status }) {
    const map = {
        in_warranty: 'bg-[rgb(var(--success)/0.1)] text-[rgb(var(--success))] border-[rgb(var(--success)/0.3)]',
        expired: 'bg-[rgb(var(--danger)/0.1)] text-[rgb(var(--danger))] border-[rgb(var(--danger)/0.3)]',
        unknown: 'bg-[rgb(var(--muted-fg)/0.1)] text-[rgb(var(--muted-fg))] border-[rgb(var(--border))]',
    }
    const cls = map[status] || map.unknown
    const label = status?.replace('_', ' ') || 'unknown'
    return <span className={`inline-block rounded-full border px-3 py-0.5 text-xs capitalize ${cls}`}>{label}</span>
}

export default function ReceiptCard({ receipt }) {
    const { prefs } = usePrefs()
    return (
        <Link to={`/receipts/${receipt.id}`} className="card overflow-hidden transition-colors hover:bg-[rgb(var(--surface-hover))]">
            <div className="bg-[#F0FDFA] px-[1.25rem] py-2 border-b border-[rgb(var(--border))]">
                <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold">
                        {receipt.title || receipt.product_name}
                    </h3>
                    <StatusBadge status={receipt.status} />
                </div>
            </div>
            <div className="card-padded grid grid-cols-[1fr_auto] gap-2">
                <div>
                    <div className="text-sm text-[rgb(var(--muted-fg))]">
                        <span><span className="font-medium">Purchased At</span>: {receipt.merchant}</span>
                        <span className="mx-2">•</span>
                        <span><span className="font-medium">Date</span>: {formatDate(receipt.purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}</span>
                        {receipt.category ? <><span className="mx-2">•</span><span><span className="font-medium">Category</span>: <span className="capitalize">{receipt.category}</span></span></> : null}
                    </div>
                    {receipt.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {receipt.tags.map((t) => (
                                <span key={t} className="rounded-md border border-[rgb(var(--border))] px-3 py-0.5 text-xs text-[rgb(var(--muted-fg))]">{t}</span>
                            ))}
                        </div>
                    ) : null}
                </div>
                <div className="text-right">
                    <div className="text-sm text-[rgb(var(--muted-fg))]">Amount</div>
                    <div className="text-lg font-semibold">{formatMoney(receipt.total_amount, prefs.currency || receipt.currency, prefs.locale)}</div>
                </div>
            </div>
        </Link>
    )
}
