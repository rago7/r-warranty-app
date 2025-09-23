import { Link } from 'react-router-dom'
import { formatDate } from '../../../lib/date'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

export default function UpcomingExpiriesWidget({ items }) {
    const { prefs } = usePrefs()
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Upcoming expiries (60 days)</h3>
            </div>
            {(!items || items.length === 0) ? (
                <p className="text-sm text-slate-600">Nothing expiring soon.</p>
            ) : (
                <ul className="grid gap-2">
                    {items.map((r) => (
                        <li key={r.id} className="flex items-center justify-between text-sm">
                            <div className="min-w-0">
                                <Link to={`/receipts/${r.id}`} className="truncate font-medium hover:underline">
                                    {r.title || r.product_name}
                                </Link>
                                <div className="truncate text-slate-600">
                                    {r.merchant} • {formatDate(r.purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}
                                </div>
                            </div>
                            <div className="ml-3 shrink-0 rounded-full border px-2 py-0.5 text-xs text-slate-700">
                                {r.days_left}d left
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
