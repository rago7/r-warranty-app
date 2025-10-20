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
            <div className="page-heading mb-3">
                <h1 className="text-xl font-bold">Receipts</h1>
                <div className="actions">
                    <Link to="/receipts/new" className="btn btn-accent">Add receipt</Link>
                </div>
            </div>

            <Filters
                filters={filters}
                onApply={({ q }) => setFilters({ q })}
                onCategoryChange={(category) => setFilters({ category })}
                onSortChange={(sort) => setFilters({ sort })}
                onPageSizeChange={(n) => setFilters({ page_size: n })}
            />

            {isLoading ? (
                <div className="receipts-list">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            ) : isError ? (
                <div className="rounded-lg border border-[rgb(var(--danger)/0.3)] bg-[rgb(var(--danger)/0.1)] p-4 text-[rgb(var(--danger))]">
                    Failed to load receipts: {error?.message || 'Unknown error'}
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center text-[rgb(var(--muted-fg))]">
                    No receipts match your filters.
                </div>
            ) : (
                <div className="receipts-list">
                    {items.map((r) => (
                        <ReceiptCard key={r.id} receipt={r} />
                    ))}
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-sm text-[rgb(var(--muted-fg))]">
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
                        className="btn btn-outline btn-sm"
                        disabled={page <= 1}
                        onClick={() => setFilters({ page: page - 1 })}
                    >
                        Prev
                    </button>
                    <button
                        className="btn btn-outline btn-sm"
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
