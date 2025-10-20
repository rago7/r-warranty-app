import { useEffect, useState } from 'react'

const CATEGORY_OPTIONS = ['all', 'electronics', 'appliances', 'fashion', 'tools', 'furniture']
const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'in_warranty', label: 'In Warranty' },
    { value: 'expired', label: 'Expired' },
    { value: 'unknown', label: 'Unknown' },
]
const SORT_OPTIONS = [
    { value: 'date_desc', label: 'Newest' },
    { value: 'date_asc', label: 'Oldest' },
    { value: 'amount_desc', label: 'Amount: High → Low' },
    { value: 'amount_asc', label: 'Amount: Low → High' },
]

function IconChevronDown(props) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    )
}

export default function FiltersBar({ q, category, status, sort, pageSize, onApply, onCategoryChange, onStatusChange, onSortChange, onPageSizeChange }) {
    const [text, setText] = useState(q || '')

    // collapse state with sessionStorage persistence
    const storageKey = 'filters.open'
    const [open, setOpen] = useState(() => {
        try {
            const raw = sessionStorage.getItem(storageKey)
            if (raw === null) return true
            return raw === 'true'
        } catch { return true }
    })
    useEffect(() => {
        try { sessionStorage.setItem(storageKey, String(open)) } catch {}
    }, [open])

    return (
        <div className="sticky-filters">
            <div className="card card-padded shadow">
                <button
                    type="button"
                    className="collapse-header w-full select-none text-left"
                    aria-expanded={open}
                    aria-controls="filters-content"
                    onClick={() => setOpen(v => !v)}
                >
                    <span className="text-base font-semibold">Filters</span>
                    <span className="collapse-chevron" aria-expanded={open}>
                        <IconChevronDown />
                    </span>
                </button>
                {open && (
                    <div id="filters-content" className="mt-3 space-y-5">
                        {/* Search (full-width row) */}
                        <div>
                            <label className="filter-label">Search</label>
                            <div className="mt-1 flex items-center gap-3">
                                <input
                                    className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-base text-[rgb(var(--fg))] placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
                                    placeholder="merchant, product, tags…"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') onApply({ q: text }) }}
                                />
                                <button className="btn btn-outline" onClick={() => onApply({ q: text })}>Apply</button>
                            </div>
                        </div>

                        {/* Other filters (second row) */}
                        <div className="grid gap-5 sm:grid-cols-4 sm:items-end">
                            {/* Category */}
                            <div>
                                <label className="filter-label">Category</label>
                                <select
                                    className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] sm:w-44"
                                    value={category || 'all'}
                                    onChange={(e) => onCategoryChange(e.target.value)}
                                >
                                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            {/* Status */}
                            <div>
                                <label className="filter-label">Status</label>
                                <select
                                    className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] sm:w-44"
                                    value={status || 'all'}
                                    onChange={(e) => onStatusChange(e.target.value)}
                                >
                                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            {/* Sort */}
                            <div>
                                <label className="filter-label">Sort</label>
                                <select
                                    className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] sm:w-48"
                                    value={sort || 'date_desc'}
                                    onChange={(e) => onSortChange(e.target.value)}
                                >
                                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            {/* Page size */}
                            <div>
                                <label className="filter-label">Per page</label>
                                <select
                                    className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] sm:w-28"
                                    value={String(pageSize || 10)}
                                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                >
                                    {[5,10,20,50].map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}