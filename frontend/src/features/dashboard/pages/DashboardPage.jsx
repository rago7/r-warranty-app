import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '../api'
import WarrantyStatusTiles from '../components/WarrantyStatusTiles'
import UpcomingExpiriesWidget from '../components/UpcomingExpiriesWidget'
import RecentReceiptsWidget from '../components/RecentReceiptsWidget'
import SpendByCategoryChart from '../components/SpendByCategoryChart'
import useTitle from '../../../lib/useTitle'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'

function formatMonthForTimezone(timezone) {
    const now = new Date()
    if (!timezone) {
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    }

    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
        })
        return formatter.format(now)
    } catch {
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    }
}

function adaptTotals(raw) {
    if (!raw) return raw
    if ('receipts_total' in raw || 'warranty_in' in raw || 'warranty_expired' in raw || 'warranty_unknown' in raw) {
        return {
            count: raw.receipts_total ?? raw.count ?? 0,
            in_warranty: raw.warranty_in ?? raw.in_warranty ?? 0,
            expired: raw.warranty_expired ?? raw.expired ?? 0,
            unknown: raw.warranty_unknown ?? raw.unknown ?? 0,
        }
    }
    return {
        count: raw.count ?? 0,
        in_warranty: raw.in_warranty ?? 0,
        expired: raw.expired ?? 0,
        unknown: raw.unknown ?? 0,
    }
}

function adaptRecent(items) {
    if (!Array.isArray(items)) return []
    return items.map((item) => {
        if (item && typeof item === 'object' && 'receipt_id' in item) {
            const totalCents = Number(item.total_cents ?? 0)
            return {
                id: item.receipt_id ?? item.id,
                title: item.title || item.merchant,
                product_name: item.product_name || item.merchant,
                merchant: item.merchant,
                purchase_date: item.purchase_at,
                total_amount: Number.isFinite(totalCents) ? totalCents / 100 : item.total_amount,
                currency: item.currency,
                extract_status: item.extract_status,
                warranty_status: item.warranty_status,
            }
        }
        return item
    })
}

function adaptUpcoming(items) {
    if (!Array.isArray(items)) return []
    return items.map((item) => {
        if (item && typeof item === 'object' && ('warranty_id' in item || 'line_item_name' in item || 'end_date' in item)) {
            return {
                id: item.warranty_id ?? item.id,
                title: item.line_item_name || item.title || item.product_name,
                product_name: item.line_item_name || item.product_name || item.title,
                merchant: item.merchant,
                purchase_date: item.end_date ?? item.purchase_date,
                days_left: item.days_left,
                type: item.type,
                purchase_id: item.purchase_id,
            }
        }
        return item
    })
}

function adaptByCategory(items) {
    if (!Array.isArray(items)) return []
    return items
}

export default function DashboardPage() {
    useTitle('Dashboard')
    const { prefs } = usePrefs()

    const month = useMemo(() => formatMonthForTimezone(prefs?.timezone), [prefs?.timezone])

    const expiringWindowDays = 60
    const recentLimit = 5

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['dashboard', 'summary', month, expiringWindowDays, recentLimit],
        queryFn: () =>
            getDashboardSummary({
                month,
                expiring_window_days: expiringWindowDays,
                recent_limit: recentLimit,
            }),
        staleTime: 60_000,
        enabled: Boolean(month),
    })

    if (isLoading) {
        return (
            <div className="grid gap-4">
                <div className="h-6 w-48 animate-pulse rounded bg-[rgb(var(--border))]" />
                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2">
                    <div className="h-40 animate-pulse rounded bg-[rgb(var(--border))]" />
                    <div className="h-40 animate-pulse rounded bg-[rgb(var(--border))]" />
                    <div className="h-40 animate-pulse rounded bg-[rgb(var(--border))]" />
                    <div className="h-40 animate-pulse rounded bg-[rgb(var(--border))]" />
                </div>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="rounded border border-[rgb(var(--danger)/0.3)] bg-[rgb(var(--danger)/0.1)] p-4 text-[rgb(var(--danger))]">
                Failed to load dashboard: {error?.message || 'Unknown error'}
            </div>
        )
    }

    const attributes = data?.data?.attributes ?? data?.attributes ?? data ?? {}
    const totals = adaptTotals(attributes?.totals)
    const recentReceipts = adaptRecent(attributes?.recent_receipts)
    const upcomingExpiries = adaptUpcoming(attributes?.upcoming_expiries)
    const byCategory = adaptByCategory(attributes?.by_category)

    return (
        <div className="grid gap-4">
            <h1 className="text-xl font-bold">Dashboard</h1>
            <div className="dashboard-sections">
                <section className="card card-padded shadow-md">
                    <h3 className="card-title">Quick look</h3>
                    <WarrantyStatusTiles totals={totals} />
                </section>
                <section className="card card-padded shadow-md">
                    <UpcomingExpiriesWidget items={upcomingExpiries} bare />
                </section>
                <section className="card card-padded shadow-md">
                    <RecentReceiptsWidget items={recentReceipts} bare />
                </section>
                <section className="card card-padded shadow-md">
                    <SpendByCategoryChart data={byCategory} bare />
                </section>
            </div>
        </div>
    )
}
