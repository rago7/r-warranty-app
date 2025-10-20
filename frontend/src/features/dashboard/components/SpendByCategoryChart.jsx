import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

export default function SpendByCategoryChart({ data, bare = false }) {
    const { prefs } = usePrefs()
    const series = Array.isArray(data) ? data : []
    const max = Math.max(1, ...series.map((d) => d.sum || 0))

    const content = (
        <>
            <h3 className="card-title">Spend by category</h3>
            {series.length === 0 ? (
                <p className="text-sm text-[rgb(var(--muted-fg))]">No data.</p>
            ) : (
                <div className="list-relaxed">
                    {series.map((d) => (
                        <div key={d.category} className="grid grid-cols-[120px_1fr_64px] items-center gap-2 text-sm">
                            <div className="truncate text-[rgb(var(--muted-fg))] capitalize">{d.category}</div>
                            <div className="h-2 rounded bg-[rgb(var(--border))]">
                                <div className="h-2 rounded bg-[rgb(var(--primary))]" style={{ width: `${(Math.max(0, d.sum) / max) * 100}%` }} />
                            </div>
                            <div className="text-right tabular-nums">{Intl.NumberFormat(prefs.locale || undefined, { style: 'currency', currency: prefs.currency || d.currency || 'USD' }).format(d.sum)}</div>
                        </div>
                    ))}
                </div>
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
