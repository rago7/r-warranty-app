export default function SpendByCategoryChart({ data }) {
    const series = Array.isArray(data) ? data : []
    const max = Math.max(1, ...series.map((d) => d.sum || 0))
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-semibold">Spend by category</h3>
            {series.length === 0 ? (
                <p className="text-sm text-slate-600">No data.</p>
            ) : (
                <div className="grid gap-2">
                    {series.map((d) => (
                        <div key={d.category} className="grid grid-cols-[120px_1fr_64px] items-center gap-2 text-sm">
                            <div className="truncate text-slate-700 capitalize">{d.category}</div>
                            <div className="h-2 rounded bg-slate-200">
                                <div className="h-2 rounded bg-indigo-600" style={{ width: `${(Math.max(0, d.sum) / max) * 100}%` }} />
                            </div>
                            <div className="text-right tabular-nums">{Intl.NumberFormat(undefined, { style: 'currency', currency: d.currency || 'USD' }).format(d.sum)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )}
