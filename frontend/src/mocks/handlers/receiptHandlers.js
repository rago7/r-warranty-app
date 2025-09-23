import { http, HttpResponse } from 'msw'
import dataset from '../fixtures/receipts.json'

// clone fixtures into in-memory DB so we can mutate
const db = { receipts: dataset.receipts.map((r) => ({ ...r })) }
export const receiptsDb = db // <-- EXPORT so dashboard can read
let counter = 1000
const genId = () => `r${++counter}`

function filterAndSort(list, params) {
    let items = [...list]
    const q = (params.get('q') || '').toLowerCase()
    const category = params.get('category') || 'all'
    const sort = params.get('sort') || 'date_desc'

    if (q) {
        items = items.filter((r) =>
            r.merchant.toLowerCase().includes(q) ||
            r.product_name.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q) ||
            (r.tags || []).some((t) => t.toLowerCase().includes(q))
        )
    }
    if (category && category !== 'all') {
        items = items.filter((r) => r.category === category)
    }

    if (sort === 'date_desc' || sort === 'date_asc') {
        items.sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date))
        if (sort === 'date_desc') items.reverse()
    } else if (sort === 'amount_desc' || sort === 'amount_asc') {
        items.sort((a, b) => (a.total_amount - b.total_amount))
        if (sort === 'amount_desc') items.reverse()
    }

    return items
}

function statusFromWarranty(warranty) {
    const end = warranty?.end_date ? new Date(warranty.end_date) : null
    if (!end) return 'unknown'
    return end.getTime() >= Date.now() ? 'in_warranty' : 'expired'
}

export const receiptHandlers = [
    // LIST
    http.get('/api/receipts', ({ request }) => {
        const url = new URL(request.url)
        const params = url.searchParams

        const page = Number(params.get('page') || '1')
        const pageSize = Number(params.get('page_size') || '10')

        const filtered = filterAndSort(db.receipts, params)
        const total = filtered.length
        const start = (page - 1) * pageSize
        const end = start + pageSize

        const items = filtered.slice(start, end)

        return HttpResponse.json({ items, total, page, page_size: pageSize }, { status: 200 })
    }),

    // DETAIL
    http.get('/api/receipts/:id', ({ params }) => {
        const id = params.id
        const found = db.receipts.find((r) => r.id === id)
        if (!found) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        const withFiles = {
            ...found,
            attachments: found.attachments && found.attachments.length > 0 ? found.attachments : [
                {
                    id: `${id}-a1`, filename: `receipt-${id}.jpg`, type: 'image', url: `https://placehold.co/600x400?text=Receipt+${id}`, size: 120000,
                },
                {
                    id: `${id}-a2`, filename: `warranty-${id}.pdf`, type: 'pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', size: 80000,
                }
            ],
        }
        return HttpResponse.json(withFiles, { status: 200 })
    }),

    // CREATE
    http.post('/api/receipts', async ({ request }) => {
        try {
            const body = await request.json()
            const id = genId()
            const rec = {
                id,
                title: body.title || body.product_name || 'Untitled',
                product_name: body.product_name || body.title || 'Unknown',
                merchant: body.merchant || 'Unknown',
                purchase_date: body.purchase_date,
                total_amount: Number(body.total_amount || 0),
                currency: body.currency || 'USD',
                category: body.category || 'electronics',
                tags: body.tags || [],
                serial_number: body.serial_number || '',
                order_number: body.order_number || '',
                warranty: body.warranty || {},
                status: statusFromWarranty(body.warranty),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                attachments: [],
            }
            db.receipts.unshift(rec)
            return HttpResponse.json(rec, { status: 201 })
        } catch (e) {
            return HttpResponse.json({ message: 'Bad request' }, { status: 400 })
        }
    }),

    // UPDATE
    http.put('/api/receipts/:id', async ({ params, request }) => {
        const id = params.id
        const idx = db.receipts.findIndex((r) => r.id === id)
        if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        const body = await request.json().catch(() => ({}))
        const merged = {
            ...db.receipts[idx],
            ...body,
            warranty: { ...db.receipts[idx].warranty, ...(body.warranty || {}) },
            status: statusFromWarranty(body.warranty || db.receipts[idx].warranty),
            updated_at: new Date().toISOString(),
        }
        db.receipts[idx] = merged
        return HttpResponse.json(merged, { status: 200 })
    }),

    // ATTACHMENT UPLOAD (mock)
    http.post('/api/receipts/:id/attachments', async ({ params, request }) => {
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
                type = (file.type || '').startsWith('image') ? 'image' : (file.name || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'file'
            }
        } catch (_) {}

        const att = {
            id: `${id}-u-${Math.random().toString(36).slice(2, 8)}`,
            filename,
            type,
            size,
            url: type === 'image' ? `https://placehold.co/800x600?text=${encodeURIComponent(filename)}` : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        }

        rec.attachments = rec.attachments || []
        rec.attachments.push(att)
        rec.updated_at = new Date().toISOString()

        await new Promise((r) => setTimeout(r, 300))

        return HttpResponse.json({ attachment: att }, { status: 201 })
    }),
]
