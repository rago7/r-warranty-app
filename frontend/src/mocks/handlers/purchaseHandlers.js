import { http, HttpResponse } from 'msw'
import { receiptsDb } from './receiptHandlers'

const db = receiptsDb

let counter = 2000
const genId = () => `p${++counter}`

function statusFromWarranty(warranty) {
    const end = warranty?.end_date ? new Date(warranty.end_date) : null
    if (!end) return 'unknown'
    return end.getTime() >= Date.now() ? 'in_warranty' : 'expired'
}

function filterAndSort(list, params) {
    let items = [...list]
    const q = (params.get('q') || '').toLowerCase()
    const category = params.get('category') || 'all'
    const sort = params.get('sort') || 'date_desc'

    if (q) {
        items = items.filter((r) =>
            (r.merchant || '').toLowerCase().includes(q) ||
            (r.product_name || '').toLowerCase().includes(q) ||
            (r.title || '').toLowerCase().includes(q) ||
            (r.tags || []).some((t) => (t || '').toLowerCase().includes(q))
        )
    }
    if (category && category !== 'all') {
        items = items.filter((r) => r.category === category)
    }

    const status = params.get('status') || 'all'
    if (status && status !== 'all') {
        items = items.filter((r) => r.status === status)
    }

    if (sort === 'date_desc' || sort === 'date_asc') {
        items.sort((a, b) => new Date(a.purchase_date || a.purchase_datetime) - new Date(b.purchase_date || b.purchase_datetime))
        if (sort === 'date_desc') items.reverse()
    } else if (sort === 'amount_desc' || sort === 'amount_asc') {
        items.sort((a, b) => a.total_amount - b.total_amount)
        if (sort === 'amount_desc') items.reverse()
    }

    return items
}

export const purchaseHandlers = [
    // LIST
    http.get('/api/purchases', ({ request }) => {
        const url = new URL(request.url)
        const params = url.searchParams

        const page = Number(params.get('page') || '1')
        const pageSize = Number(params.get('page_size') || '10')

        const filtered = filterAndSort(db.receipts, params)
        const total = filtered.length
        const start = (page - 1) * pageSize
        const end = start + pageSize

        const items = filtered.slice(start, end)

        // derive has_warranty_items
        const enriched = items.map((it) => ({
            ...it,
            line_items: it.line_items || it.items || [],
            has_warranty_items: (it.line_items || it.items || []).some((li) => !!(li?.warranty && li.warranty.end_date)),
        }))

        return HttpResponse.json({ items: enriched, total, page, page_size: pageSize }, { status: 200 })
    }),

    // DETAIL
    http.get('/api/purchases/:id', ({ params }) => {
        const id = params.id
        const found = db.receipts.find((r) => r.id === id)
        if (!found) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        const withFiles = {
            ...found,
            line_items: found.line_items || found.items || [],
            attachments:
                found.attachments && found.attachments.length > 0
                    ? found.attachments
                    : [
                        {
                            id: `${id}-a1`,
                            filename: `purchase-${id}.jpg`,
                            type: 'image',
                            url: `https://placehold.co/600x400?text=Purchase+${id}`,
                            size: 120000,
                        },
                    ],
        }
        return HttpResponse.json(withFiles, { status: 200 })
    }),

    // CREATE
    http.post('/api/purchases', async ({ request }) => {
        try {
            const body = await request.json()
            const id = genId()
            const rec = {
                id,
                title: body.title || body.product_name || 'Untitled',
                product_name: body.product_name || body.title || 'Unknown',
                merchant: body.merchant || 'Unknown',
                purchase_date: body.purchase_date || new Date().toISOString().slice(0, 10),
                purchase_time: body.purchase_time || new Date().toISOString(),
                purchase_datetime: body.purchase_datetime || body.purchase_time || new Date().toISOString(),
                total_amount: Number(body.total_amount || 0),
                currency: body.currency || 'USD',
                purchase_category: body.purchase_category || body.category || 'electronics',
                tags: body.tags || [],
                warranty: body.warranty || {},
                line_items: Array.isArray(body.line_items) ? body.line_items : (body.items || []),
                status: statusFromWarranty(body.warranty),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                attachments: [],
            }
            db.receipts.unshift(rec)
            return HttpResponse.json(rec, { status: 201 })
        } catch {
            return HttpResponse.json({ message: 'Bad request' }, { status: 400 })
        }
    }),

    // UPDATE
    http.put('/api/purchases/:id', async ({ params, request }) => {
        const id = params.id
        const idx = db.receipts.findIndex((r) => r.id === id)
        if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        const body = await request.json().catch(() => ({}))
        const merged = {
            ...db.receipts[idx],
            ...body,
            warranty: { ...db.receipts[idx].warranty, ...(body.warranty || {}) },
            line_items: Array.isArray(body.line_items) ? body.line_items : (db.receipts[idx].line_items || db.receipts[idx].items || []),
            status: statusFromWarranty(body.warranty || db.receipts[idx].warranty),
            updated_at: new Date().toISOString(),
        }
        db.receipts[idx] = merged
        return HttpResponse.json(merged, { status: 200 })
    }),

    // ATTACHMENT UPLOAD (mock)
    http.post('/api/purchases/:id/attachments', async ({ params, request }) => {
        const id = params.id
        const rec = db.receipts.find((r) => r.id === id)
        if (!rec) return HttpResponse.json({ message: 'Not found' }, { status: 404 })

        let filename = 'file'
        let type = 'file'
        let size = 0
        try {
            const form = await request.formData()
            const file = form.get('file')
            if (file && typeof file === 'object') {
                filename = file.name || filename
                size = file.size || 0
                type =
                    (file.type || '').startsWith('image')
                        ? 'image'
                        : (file.name || '').toLowerCase().endsWith('.pdf')
                            ? 'pdf'
                            : 'file'
            }
        } catch (_) {}

        const att = {
            id: `${id}-u-${Math.random().toString(36).slice(2, 8)}`,
            filename,
            type,
            size,
            url:
                type === 'image'
                    ? `https://placehold.co/800x600?text=${encodeURIComponent(filename)}`
                    : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        }

        rec.attachments = rec.attachments || []
        rec.attachments.push(att)
        rec.updated_at = new Date().toISOString()

        await new Promise((r) => setTimeout(r, 300))
        return HttpResponse.json({ attachment: att }, { status: 201 })
    }),

    // LINE-ITEM ATTACHMENT UPLOAD (mock)
    http.post('/api/purchases/:id/line_items/:liId/attachments', async ({ params, request }) => {
        const id = params.id
        const liId = params.liId
        const rec = db.receipts.find((r) => r.id === id)
        if (!rec) return HttpResponse.json({ message: 'Not found' }, { status: 404 })

        // ensure line_items array exists
        rec.line_items = rec.line_items || rec.items || []
        const liIdx = rec.line_items.findIndex((li) => String(li.id) === String(liId))
        if (liIdx === -1) {
            // If li not found, create a placeholder line item with that id
            rec.line_items.push({ id: liId, name: 'Unknown item', attachments: [] })
        }

        let filename = 'file'
        let type = 'file'
        let size = 0
        try {
            const form = await request.formData()
            const file = form.get('file')
            if (file && typeof file === 'object') {
                filename = file.name || filename
                size = file.size || 0
                type =
                    (file.type || '').startsWith('image')
                        ? 'image'
                        : (file.name || '').toLowerCase().endsWith('.pdf')
                            ? 'pdf'
                            : 'file'
            }
        } catch (_) {}

        const att = {
            id: `${id}-${liId}-u-${Math.random().toString(36).slice(2, 8)}`,
            filename,
            type,
            size,
            url:
                type === 'image'
                    ? `https://placehold.co/800x600?text=${encodeURIComponent(filename)}`
                    : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        }

        const targetLi = rec.line_items.find((li) => String(li.id) === String(liId))
        if (targetLi) {
            targetLi.attachments = targetLi.attachments || []
            targetLi.attachments.push(att)
        }

        rec.updated_at = new Date().toISOString()
        await new Promise((r) => setTimeout(r, 300))
        return HttpResponse.json({ attachment: att }, { status: 201 })
    }),

    // DELETE
    http.delete('/api/purchases/:id', ({ params }) => {
        const id = params.id
        const idx = db.receipts.findIndex((r) => r.id === id)
        if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        db.receipts.splice(idx, 1)
        return HttpResponse.json({ ok: true }, { status: 200 })
    }),
]
