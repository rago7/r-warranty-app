import { Link } from 'react-router-dom'
import { formatMoney } from '../../../lib/currency'
import { formatDate } from '../../../lib/date'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

export default function RecentReceiptsWidget({ items, bare = false }) {
    const { prefs } = usePrefs()

    const content = (
        <>
            <div className="mb-2 flex items-center justify-between">
                <h3 className="card-title">Recent receipts</h3>
            </div>
            {(!items || items.length === 0) ? (
                <p className="text-sm text-slate-600">No recent receipts.</p>
            ) : (
                <ul className="grid gap-2">
                    {items.map((r, i) => (
                        <li key={r.id || r.order_number || `${r.merchant}-${r.purchase_date}-${i}` }
                            className="flex items-center justify-between text-sm">
                            <div className="min-w-0">
                                <Link to={`/receipts/${r.id}`} className="truncate font-medium hover:underline">
                                    {r.title || r.product_name}
                                </Link>
                                <div className="truncate text-slate-600">{r.merchant} • {formatDate(r.purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}</div>
                            </div>
                            <div className="ml-3 shrink-0 font-medium">{formatMoney(r.total_amount, prefs.currency || r.currency, prefs.locale)}</div>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )

    if (bare) return content

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            {content}
        </div>
    )
}
