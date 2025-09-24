import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { listReceipts } from '../api'
import ReceiptCard from '../components/ReceiptCard'
import Skeleton from '../../../components/feedback/Skeleton'
import useTitle from '../../../lib/useTitle'
import FiltersBar from "../components/FiltersBar.jsx";

function useFilters() {
    const [sp, setSp] = useSearchParams()
    const filters = useMemo(() => ({
        q: sp.get('q') || '',
        category: sp.get('category') || 'all',
        sort: sp.get('sort') || 'date_desc',
        page: Number(sp.get('page') || '1'),
        page_size: Number(sp.get('page_size') || '10'),
    }), [sp])

    const set = (patch) => {
        const next = new URLSearchParams(sp)
        Object.entries(patch).forEach(([k, v]) => {
            if (v === undefined || v === null || v === '' || v === 'all') next.delete(k)
            else next.set(k, String(v))
        })
        if (patch.q !== undefined || patch.category !== undefined || patch.page_size !== undefined || patch.sort !== undefined) {
            next.set('page', '1')
        }
        setSp(next, { replace: true })
    }

    return [filters, set]
}

export default function ReceiptsListPage() {
    useTitle('Receipts')
    const [filters, setFilters] = useFilters()

    const query = useQuery({
        queryKey: ['receipts', filters],
        queryFn: () => listReceipts(filters),
        keepPreviousData: true,
    })

    const { data, isLoading, isError, error, isFetching } = query
    const items = data?.items || []
    const total = data?.total || 0
    const page = data?.page || filters.page
    const pageSize = data?.page_size || filters.page_size

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h1 className="text-xl font-bold">Receipts</h1>
                <Link to="/receipts/new" className="rounded-lg border border-slate-200 bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">Add receipt</Link>
            </div>

            <Filters
                filters={filters}
                onApply={({ q }) => setFilters({ q })}
                onCategoryChange={(category) => setFilters({ category })}
                onSortChange={(sort) => setFilters({ sort })}
                onPageSizeChange={(n) => setFilters({ page_size: n })}
            />

            {isLoading ? (
                <div className="grid gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            ) : isError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
                    Failed to load receipts: {error?.message || 'Unknown error'}
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
                    No receipts match your filters.
                </div>
            ) : (
                <div className="grid gap-3">
                    {items.map((r) => (
                        <ReceiptCard key={r.id} receipt={r} />
                    ))}
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <div>
                    {total > 0 && (
                        <span>
              Showing <strong>{(page - 1) * pageSize + 1}</strong>–
              <strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong>
            </span>
                    )}
                    {isFetching && <span className="ml-2 italic">(updating…)</span>}
                </div>
                <div className="flex gap-2">
                    <button
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => setFilters({ page: page - 1 })}
                    >
                        Prev
                    </button>
                    <button
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-50"
                        disabled={page * pageSize >= total}
                        onClick={() => setFilters({ page: page + 1 })}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}

function Filters({ filters, onApply, onCategoryChange, onSortChange, onPageSizeChange }) {
    // const FiltersBar = require('../components/FiltersBar').default
    return (
        <div>
            <FiltersBar
                q={filters.q}
                category={filters.category}
                sort={filters.sort}
                pageSize={filters.page_size}
                onApply={onApply}
                onCategoryChange={onCategoryChange}
                onSortChange={onSortChange}
                onPageSizeChange={onPageSizeChange}
            />
        </div>
    )
}
