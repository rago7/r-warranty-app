import { http, HttpResponse } from 'msw'
import { receiptsDb } from './receiptHandlers'

const DAY_MS = 24 * 60 * 60 * 1000
const MONEY_FACTOR = 100

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
    const purchaseAt = record.purchase?.purchase_at
    if (purchaseAt) {
        const maybe = new Date(purchaseAt)
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
    const firstLineItem = record.line_items?.[0]
    return {
        receipt_id: record.id,
        purchase_id: record.purchase?.id ?? record.id,
        merchant: record.merchant?.name ?? 'Unknown merchant',
        purchase_at: purchaseAt,
        total_cents: record.purchase?.total_cents ?? 0,
        currency: record.purchase?.currency ?? 'USD',
        extract_status: record.extract_status ?? 'success',
        warranty_status: record.warranty_status ?? 'unknown',
        line_item_name: firstLineItem?.name ?? null,
    }
}

function collectWarrantyEntries(record) {
    const merchantName = record.merchant?.name ?? 'Unknown merchant'
    const purchaseId = record.purchase?.id ?? record.id
    const entries = []
    if (record.purchase_level_warranty?.end_date) {
        entries.push({
            warranty_id: record.purchase_level_warranty.id,
            purchase_id: purchaseId,
            line_item_name: 'Purchase coverage',
            merchant: merchantName,
            end_date: record.purchase_level_warranty.end_date,
            type: record.purchase_level_warranty.type ?? 'manufacturer',
        })
    }
    for (const item of record.line_items || []) {
        if (item.warranty_applicable && item.warranty?.end_date) {
            entries.push({
                warranty_id: item.warranty.id,
                purchase_id: purchaseId,
                line_item_name: item.name ?? 'Item',
                merchant: merchantName,
                end_date: item.warranty.end_date,
                type: item.warranty.type ?? 'manufacturer',
            })
        }
    }
    return entries
}

function buildCategoryStats(records, month) {
    const map = new Map()
    for (const record of records) {
        const purchaseAt = ensurePurchaseAt(record)
        if (month && purchaseAt.toISOString().slice(0, 7) !== month) continue
        const currency = record.purchase?.currency ?? 'USD'
        for (const item of record.line_items || []) {
            const key = item.category_id || 'uncategorized'
            const prev = map.get(key) || { category: key, sum: 0, count: 0, currency }
            prev.sum += Number(item.line_total_cents ?? 0)
            prev.count += 1
            prev.currency = currency
            map.set(key, prev)
        }
    }

    return Array.from(map.values())
        .map((entry) => ({
            ...entry,
            sum: entry.sum / MONEY_FACTOR,
        }))
        .sort((a, b) => b.sum - a.sum)
}

function buildTotals(records) {
    const totals = {
        receipts_total: records.length,
        warranty_in: 0,
        warranty_expired: 0,
        warranty_unknown: 0,
    }
    for (const record of records) {
        const status = record.warranty_status ?? 'unknown'
        if (status === 'in_warranty') totals.warranty_in += 1
        else if (status === 'expired') totals.warranty_expired += 1
        else totals.warranty_unknown += 1
    }
    return totals
}

function buildUpcoming(records, windowDays) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const horizon = new Date(now.getTime() + windowDays * DAY_MS)
    const entries = []
    for (const record of records) {
        for (const entry of collectWarrantyEntries(record)) {
            const end = new Date(entry.end_date)
            if (Number.isNaN(end.getTime())) continue
            if (end < now || end > horizon) continue
            const daysLeft = Math.ceil((end.getTime() - now.getTime()) / DAY_MS)
            entries.push({ ...entry, end_date: entry.end_date, days_left: daysLeft })
        }
    }
    return entries.sort((a, b) => a.days_left - b.days_left).slice(0, 6)
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
