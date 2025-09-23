export default function WarrantyStatusTiles({ totals }) {
    const blocks = [
        { key: 'count', label: 'Total Receipts' },
        { key: 'in_warranty', label: 'In Warranty' },
        { key: 'expired', label: 'Expired' },
        { key: 'unknown', label: 'Unknown' },
    ]
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {blocks.map((b) => (
                <div key={b.key} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-sm text-slate-500">{b.label}</div>
                    <div className="text-2xl font-bold">{totals?.[b.key] ?? 0}</div>
                </div>
            ))}
        </div>
    )
}
