import { http, HttpResponse } from 'msw'
import { receiptsDb } from './receiptHandlers'

const DAY_MS = 24 * 60 * 60 * 1000

function normalizeMonth(value) {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return /^\d{4}-\d{2}$/.test(trimmed) ? trimmed : null
}

function currentMonth() {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function ensurePurchaseAt(record) {
    if (record.purchase_time) {
        const maybe = new Date(record.purchase_time)
        if (!Number.isNaN(maybe.getTime())) return maybe
    }
    if (record.purchase_date) {
        const maybe = new Date(`${record.purchase_date}T12:00:00Z`)
        if (!Number.isNaN(maybe.getTime())) return maybe
    }
    return new Date()
}

function toNumber(value, fallback) {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function buildRecentReceipt(record) {
    const purchaseAt = ensurePurchaseAt(record).toISOString()
    return {
        receipt_id: record.id,
        purchase_id: record.purchase_id,
        merchant: record.merchant,
        purchase_at: purchaseAt,
        total_cents: Math.round(Number(record.total_amount || 0) * 100),
        currency: record.currency || 'USD',
        extract_status: record.extract_status || 'success',
        warranty_status: record.status || 'unknown',
    }
}

function buildUpcomingExpiry(record) {
    const endDate = record.warranty?.end_date
    if (!endDate) return null
    const end = new Date(endDate)
    if (Number.isNaN(end.getTime())) return null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / DAY_MS)
    if (daysLeft < 0) return null
    return {
        warranty_id: record.warranty?.id || `${record.id}-war`,
        purchase_id: record.purchase_id,
        line_item_name: record.product_name || record.title || 'Item',
        merchant: record.merchant,
        end_date: end.toISOString().slice(0, 10),
        days_left: daysLeft,
        type: record.warranty?.type || 'manufacturer',
    }
}

function buildCategoryStats(records, month) {
    const monthRecords = month
        ? records.filter((record) => {
              const purchaseAt = ensurePurchaseAt(record)
              return purchaseAt.toISOString().slice(0, 7) === month
          })
        : records

    const map = new Map()
    for (const record of monthRecords) {
        const key = record.category || 'uncategorized'
        const prev = map.get(key) || { category: key, sum: 0, count: 0, currency: record.currency || 'USD' }
        prev.sum += Number(record.total_amount || 0)
        prev.count += 1
        map.set(key, prev)
    }

    return Array.from(map.values()).sort((a, b) => b.sum - a.sum)
}

function buildTotals(records) {
    const totals = {
        receipts_total: records.length,
        warranty_in: 0,
        warranty_expired: 0,
        warranty_unknown: 0,
    }
    for (const record of records) {
        if (record.status === 'in_warranty') totals.warranty_in += 1
        else if (record.status === 'expired') totals.warranty_expired += 1
        else totals.warranty_unknown += 1
    }
    return totals
}

function buildUpcoming(records, windowDays) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const horizon = new Date(now.getTime() + windowDays * DAY_MS)
    return records
        .map((record) => buildUpcomingExpiry(record))
        .filter((item) => item && new Date(item.end_date) <= horizon)
        .sort((a, b) => a.days_left - b.days_left)
        .slice(0, 6)
}

function buildRecent(records, limit) {
    return [...records]
        .sort((a, b) => ensurePurchaseAt(b) - ensurePurchaseAt(a))
        .slice(0, limit)
        .map((record) => buildRecentReceipt(record))
}

function buildLinks(month) {
    return {
        receipts_all: '/receipts?sort=-purchase_at',
        warranty_in: '/warranties?status=active',
        warranty_expired: '/warranties?status=expired',
        warranty_unknown: '/warranties?status=unknown',
        receipts_recent: '/receipts?sort=-purchase_at&limit=20',
        expiring: '/warranties?status=active&expiring_within_days=60',
        category_breakdown: `/analytics/spend-by-category?month=${month}`,
    }
}

export const dashboardHandlers = [
    http.get('/api/dashboard/summary', ({ request }) => {
        const url = new URL(request.url)
        const params = url.searchParams

        const month = normalizeMonth(params.get('month')) || currentMonth()
        const expiringWindowDays = Math.max(0, Math.floor(toNumber(params.get('expiring_window_days'), 60)))
        const recentLimit = Math.max(0, Math.floor(toNumber(params.get('recent_limit'), 5)))

        const records = receiptsDb.receipts

        const totals = buildTotals(records)
        const recent = buildRecent(records, recentLimit)
        const upcoming = buildUpcoming(records, expiringWindowDays)
        const byCategory = buildCategoryStats(records, month)

        return HttpResponse.json(
            {
                data: {
                    type: 'dashboard_overview',
                    id: `mock-user:${month}`,
                    attributes: {
                        totals,
                        recent_receipts: recent,
                        upcoming_expiries: upcoming,
                        by_category: byCategory,
                    },
                },
                links: buildLinks(month),
                meta: {
                    timezone: 'UTC',
                    generated_at: new Date().toISOString(),
                },
            },
            { status: 200 },
        )
    }),
]
