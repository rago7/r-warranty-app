import { useState } from 'react'


const CATEGORY_OPTIONS = ['all', 'electronics', 'appliances', 'fashion', 'tools', 'furniture']
const SORT_OPTIONS = [
    { value: 'date_desc', label: 'Newest' },
    { value: 'date_asc', label: 'Oldest' },
    { value: 'amount_desc', label: 'Amount: High → Low' },
    { value: 'amount_asc', label: 'Amount: Low → High' },
]


export default function FiltersBar({ q, category, sort, pageSize, onApply, onCategoryChange, onSortChange, onPageSizeChange }) {
    const [text, setText] = useState(q || '')
    return (
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
            {/* Search */}
            <div className="flex-1">
                <label className="block text-sm font-medium">Search</label>
                <div className="mt-1 flex gap-2">
                    <input
                        className="w-full rounded-lg border border-[rgb(var(--border))] bg-white px-3 py-2 text-[rgb(var(--fg))] placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
                        placeholder="merchant, product, tags…"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') onApply({ q: text }) }}
                    />
                    <button className="btn btn-outline" onClick={() => onApply({ q: text })}>Apply</button>
                </div>
            </div>
            {/* Category */}
            <div>
                <label className="block text-sm font-medium">Category</label>
                <select
                    className="mt-1 w-full rounded-lg border border-[rgb(var(--border))] bg-white px-2 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] sm:w-44"
                    value={category || 'all'}
                    onChange={(e) => onCategoryChange(e.target.value)}
                >
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>


            {/* Sort */}
            <div>
                <label className="block text-sm font-medium">Sort</label>
                <select
                    className="mt-1 w-full rounded-lg border border-[rgb(var(--border))] bg-white px-2 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] sm:w-48"
                    value={sort || 'date_desc'}
                    onChange={(e) => onSortChange(e.target.value)}
                >
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>


            {/* Page size */}
            <div>
                <label className="block text-sm font-medium">Per page</label>
                <select
                    className="mt-1 w-full rounded-lg border border-[rgb(var(--border))] bg-white px-2 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] sm:w-28"
                    value={String(pageSize || 10)}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                    {[5,10,20,50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
        </div>
    )
}