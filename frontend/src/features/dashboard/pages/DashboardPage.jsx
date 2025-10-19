import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '../api'
import WarrantyStatusTiles from '../components/WarrantyStatusTiles'
import UpcomingExpiriesWidget from '../components/UpcomingExpiriesWidget'
import RecentReceiptsWidget from '../components/RecentReceiptsWidget'
import SpendByCategoryChart from '../components/SpendByCategoryChart'
import useTitle from '../../../lib/useTitle'

export default function DashboardPage() {
    useTitle('Dashboard')
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['dashboard','summary'],
        queryFn: getDashboardSummary,
        staleTime: 60_000,
    })

    if (isLoading) {
        return (
            <div className="grid gap-4">
                <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2">
                    <div className="h-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-40 animate-pulse rounded bg-slate-200" />
                    <div className="h-40 animate-pulse rounded bg-slate-200" />
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="rounded border border-rose-200 bg-rose-50 p-4 text-rose-800">
                Failed to load dashboard: {error?.message || 'Unknown error'}
            </div>
        )
    }

    const s = data || {}

    return (
        <div className="grid gap-4">
            <h1 className="text-xl font-bold">Dashboard</h1>
            <div className="dashboard-sections">
                <section className="card card-padded shadow-md">
                    <h3 className="card-title">Quick look</h3>
                    <WarrantyStatusTiles totals={s.totals} />
                </section>
                <section className="card card-padded shadow-md">
                    <UpcomingExpiriesWidget items={s.upcoming_expiries} bare />
                </section>
                <section className="card card-padded shadow-md">
                    <RecentReceiptsWidget items={s.recent_receipts} bare />
                </section>
                <section className="card card-padded shadow-md">
                    <SpendByCategoryChart data={s.by_category} bare />
                </section>
            </div>
        </div>
    )
}
