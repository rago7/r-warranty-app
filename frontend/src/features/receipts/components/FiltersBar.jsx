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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* Search */}
            <div className="flex-1">
                <label className="block text-sm font-medium">Search</label>
                <div className="mt-1 flex gap-2">
                    <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="merchant, product, tags…"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') onApply({ q: text }) }}
                    />
                    <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50" onClick={() => onApply({ q: text })}>Apply</button>
                </div>
            </div>
            {/* Category */}
            <div>
                <label className="block text-sm font-medium">Category</label>
                <select
                    className="mt-1 w-44 rounded-lg border border-slate-300 px-2 py-2"
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
                    className="mt-1 w-48 rounded-lg border border-slate-300 px-2 py-2"
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
                    className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-2"
                    value={String(pageSize || 10)}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                    {[5,10,20,50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
        </div>
    )
}