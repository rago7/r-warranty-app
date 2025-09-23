import { http, HttpResponse } from 'msw'
import { receiptsDb } from './receiptHandlers'

const CURRENCY = 'USD'

function computeStatus(r) {
    const end = r?.warranty?.end_date ? new Date(r.warranty.end_date) : null
    if (!end) return 'unknown'
    return end.getTime() >= Date.now() ? 'in_warranty' : 'expired'
}

export const dashboardHandlers = [
    http.get('/api/dashboard/summary', () => {
        const list = receiptsDb.receipts

        const totals = { count: 0, in_warranty: 0, expired: 0, unknown: 0, sum: 0, currency: CURRENCY }

        const byCategoryMap = new Map()

        for (const r of list) {
            totals.count += 1
            const st = computeStatus(r)
            totals[st] += 1
            const amt = Number(r.total_amount || 0)
            totals.sum += amt

            const key = r.category || 'uncategorized'
            const prev = byCategoryMap.get(key) || { category: key, count: 0, sum: 0, currency: r.currency || CURRENCY }
            prev.count += 1
            prev.sum += amt
            byCategoryMap.set(key, prev)
        }

        const by_category = Array.from(byCategoryMap.values()).sort((a, b) => b.sum - a.sum)

        // Upcoming expiries in next 60 days
        const today = new Date()
        const horizon = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
        const upcoming = list
            .map((r) => {
                const end = r?.warranty?.end_date ? new Date(r.warranty.end_date) : null
                if (!end) return null
                const msLeft = end.getTime() - today.setHours(0,0,0,0)
                const days_left = Math.ceil(msLeft / (1000*60*60*24))
                return { ...r, days_left }
            })
            .filter((r) => r && r.days_left >= 0)
            .filter((r) => new Date(r.warranty.end_date) <= horizon)
            .sort((a, b) => a.days_left - b.days_left)
            .slice(0, 6)

        // Recent receipts by purchase_date
        const recent = [...list]
            .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
            .slice(0, 6)

        return HttpResponse.json({
            totals,
            by_category,
            upcoming_expiries: upcoming,
            recent_receipts: recent,
        }, { status: 200 })
    })
]
