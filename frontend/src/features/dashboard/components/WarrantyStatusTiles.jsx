import { Link } from 'react-router-dom'

export default function WarrantyStatusTiles({ totals }) {
    const blocks = [
        { key: 'count', label: 'All Receipts', url: '/receipts' },
        { key: 'in_warranty', label: 'In Warranty', url: '/receipts?status=in_warranty' },
        { key: 'expired', label: 'Expired', url: '/receipts?status=expired' },
        { key: 'unknown', label: 'Unknown', url: '/receipts?status=unknown' },
    ]
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {blocks.map((b) => (
                <Link 
                    key={b.key} 
                    to={b.url}
                    className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow transition-colors hover:bg-[rgb(var(--surface-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.4)]"
                >
                    <div className="text-sm text-slate-500">{b.label}</div>
                    <div className="text-2xl font-bold">{totals?.[b.key] ?? 0}</div>
                </Link>
            ))}
        </div>
    )
}
