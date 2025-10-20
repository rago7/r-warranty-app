import { Link } from 'react-router-dom'
import { formatDate } from '../../../lib/date'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

export default function UpcomingExpiriesWidget({ items, bare = false }) {
    const { prefs } = usePrefs()

    const content = (
        <>
            <div className="mb-2 flex items-center justify-between">
                <h3 className="card-title">Upcoming expiries (60 days)</h3>
            </div>
            {(!items || items.length === 0) ? (
                <p className="text-sm text-[rgb(var(--muted-fg))]">Nothing expiring soon.</p>
            ) : (
                <ul className="list-relaxed">
                    {items.map((r, i) => (
                        <li key={r.id || r.order_number || `${r.merchant}-${r.purchase_date}-${i}` }
                            className="flex items-center justify-between text-sm">
                            <div className="min-w-0">
                                <Link to={`/receipts/${r.id}`} className="truncate font-medium hover:underline">
                                    {r.title || r.product_name}
                                </Link>
                                <div className="truncate text-[rgb(var(--muted-fg))]">
                                    {r.merchant} • {formatDate(r.purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}
                                </div>
                            </div>
                            <div className="ml-3 shrink-0 rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-xs text-[rgb(var(--muted-fg))]">
                                {r.days_left}d left
                            </div>
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
