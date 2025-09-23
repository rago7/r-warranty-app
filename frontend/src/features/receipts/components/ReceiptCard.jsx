import { formatDate } from '../../../lib/date'
import { formatMoney } from '../../../lib/currency'
import { Link } from 'react-router-dom'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

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

export default function ReceiptCard({ receipt }) {
    const { prefs } = usePrefs()
    return (
        <Link to={`/receipts/${receipt.id}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">
                        {receipt.title || receipt.product_name}
                    </h3>
                    <StatusBadge status={receipt.status} />
                </div>
                <div className="mt-1 text-sm text-slate-600">
                    <span>{receipt.merchant}</span>
                    <span className="mx-2">•</span>
                    <span>{formatDate(receipt.purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}</span>
                    {receipt.category ? <><span className="mx-2">•</span><span className="capitalize">{receipt.category}</span></> : null}
                </div>
                {receipt.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {receipt.tags.map((t) => (
                            <span key={t} className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-700">{t}</span>
                        ))}
                    </div>
                ) : null}
            </div>
            <div className="text-right">
                <div className="text-sm text-slate-500">Amount</div>
                <div className="text-lg font-semibold">{formatMoney(receipt.total_amount, prefs.currency || receipt.currency, prefs.locale)}</div>
            </div>
        </Link>
    )
}
