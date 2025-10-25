import { Link } from 'react-router-dom'
import { formatMoney } from '../../../lib/currency'
import { formatDate } from '../../../lib/date'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

export default function RecentReceiptsWidget({ items, bare = false }) {
    const { prefs } = usePrefs()

    const content = (
        <>
            <h3 className="card-title">Recent purchases</h3>
            {(!items || items.length === 0) ? (
                <p className="text-sm text-[rgb(var(--muted-fg))]">No recent purchases.</p>
            ) : (
                <ul className="list-relaxed">
                    {items.map((r, i) => (
                        <li key={r.id || r.order_number || `${r.merchant}-${r.purchase_date}-${i}` }
                            className="flex items-center justify-between text-sm">
                            <div className="min-w-0">
                                <Link to={`/purchases/${r.id}`} className="truncate font-medium hover:underline">
                                    {r.title || r.product_name}
                                </Link>
                                <div className="truncate text-[rgb(var(--muted-fg))]">{r.merchant} • {formatDate(r.purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}</div>
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
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
            {content}
        </div>
    )
}
