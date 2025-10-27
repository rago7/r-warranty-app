import { http, HttpResponse } from 'msw'
import dataset from '../fixtures/receipts.json'

function toCents(value) {
    const num = Number(value)
    if (!Number.isFinite(num)) return 0
    return Math.round(num * 100)
}

function ensureIso(dateString, timeString) {
    if (timeString) {
        const candidate = new Date(timeString)
        if (!Number.isNaN(candidate.getTime())) return candidate.toISOString()
    }
    if (dateString) {
        const base = `${dateString}T12:00:00Z`
        const candidate = new Date(base)
        if (!Number.isNaN(candidate.getTime())) return candidate.toISOString()
    }
    return new Date().toISOString()
}

function statusFromWarranty(warranty) {
    const end = warranty?.end_date ? new Date(warranty.end_date) : null
    if (!end) return 'unknown'
    return end.getTime() >= Date.now() ? 'in_warranty' : 'expired'
}

function buildSearchBlob(record) {
    const tags = Array.isArray(record.tags) ? record.tags.join(' ') : ''
    return [record.merchant, record.product_name, record.title, record.category, tags]
        .filter(Boolean)
        .join(' ') 
        .toLowerCase()
}

function buildSnippet(record, query) {
    if (!query) return null
    const lc = query.toLowerCase()
    if ((record.merchant || '').toLowerCase().includes(lc)) {
        return `Merchant match: ${record.merchant}`
    }
    if ((record.product_name || '').toLowerCase().includes(lc)) {
        return `Product match: ${record.product_name}`
    }
    if ((record.title || '').toLowerCase().includes(lc)) {
        return `Title match: ${record.title}`
    }
    if ((record.category || '').toLowerCase().includes(lc)) {
        return `Category match: ${record.category}`
    }
    if (Array.isArray(record.tags)) {
        const found = record.tags.find((tag) => (tag || '').toLowerCase().includes(lc))
        if (found) return `Tag match: ${found}`
    }
    return null
}

function buildLineItems(record) {
    if (Array.isArray(record.line_items) && record.line_items.length > 0) {
        return record.line_items.map((item, index) => ({
            id: item.id ?? `${record.id}-li-${index + 1}`,
            name: item.name ?? item.title ?? record.product_name ?? record.title ?? 'Item',
            quantity: item.quantity ?? 1,
            unit_price_cents: item.unit_price_cents ?? item.unit_price ?? toCents(record.total_amount),
            line_total_cents: item.line_total_cents ?? item.line_total ?? toCents(record.total_amount),
            category_id: item.category_id ?? record.category ?? 'general',
            returnable_until: item.returnable_until ?? record.warranty?.end_date ?? null,
            warranty_applicable: item.warranty_applicable ?? Boolean(record.warranty),
        }))
    }

    return [
        {
            id: `${record.id}-li-1`,
            name: record.product_name || record.title || 'Item',
            quantity: 1,
            unit_price_cents: toCents(record.total_amount),
            line_total_cents: toCents(record.total_amount),
            category_id: record.category || 'general',
            returnable_until: record.warranty?.end_date ?? null,
            warranty_applicable: Boolean(record.warranty),
        },
    ]
}

function buildWarranties(record) {
    if (Array.isArray(record.warranties) && record.warranties.length > 0) {
        return record.warranties.map((w, index) => ({
            id: w.id ?? `${record.id}-war-${index + 1}`,
            type: w.type ?? 'manufacturer',
            end_date: w.end_date ?? null,
            provider: w.provider ?? record.warranty?.provider ?? null,
            level: w.level ?? 'purchase',
        }))
    }
    if (!record.warranty) return []
    return [
        {
            id: record.warranty.id ?? `${record.id}-war-1`,
            type: record.warranty.type ?? 'manufacturer',
            end_date: record.warranty.end_date ?? null,
            provider: record.warranty.provider ?? null,
            level: record.warranty.level ?? 'purchase',
        },
    ]
}

export const receiptsDb = {
    receipts: (dataset?.receipts || []).map((raw, idx) => {
        const id = raw?.id ?? `r_seed_${idx + 1}`
        const warranty = raw?.warranty || null
        const status = statusFromWarranty(warranty)
        const purchaseAt = ensureIso(raw?.purchase_date, raw?.purchase_time)
        const currency = raw?.currency || 'USD'
        const totalAmount = Number(raw?.total_amount ?? 0)
        return {
            id,
            title: raw?.title ?? raw?.product_name ?? 'Untitled',
            product_name: raw?.product_name ?? raw?.title ?? 'Unknown item',
            merchant: raw?.merchant ?? 'Unknown merchant',
            merchant_location: raw?.merchant_location ?? 'Online',
            purchase_date: raw?.purchase_date ?? new Date().toISOString().slice(0, 10),
            purchase_time: raw?.purchase_time ?? purchaseAt,
            purchase_id: raw?.purchase_id ?? `pur_${id}`,
            total_amount: totalAmount,
            currency,
            category: raw?.category ?? 'general',
            tags: Array.isArray(raw?.tags) ? raw.tags : [],
            serial_number: raw?.serial_number ?? '',
            order_number: raw?.order_number ?? '',
            warranty,
            warranties: raw?.warranties,
            status,
            extract_status: raw?.extract_status ?? 'success',
            confidence_score: raw?.confidence_score ?? 0.96,
            created_at: raw?.created_at ?? new Date().toISOString(),
            updated_at: raw?.updated_at ?? new Date().toISOString(),
            payment_method_type: raw?.payment_method_type ?? 'card',
            purchase_status: raw?.purchase_status ?? 'posted',
            posted_at: raw?.posted_at ?? purchaseAt,
            line_items: raw?.line_items,
            attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
            document_id: raw?.document_id ?? `doc_${id}`,
            search_blob: buildSearchBlob(raw),
        }
    }),
}
const db = receiptsDb

let counter = 1000
const genId = () => `r${++counter}`

function filterAndSort(list, params) {
    let items = [...list]
    const q = (params.get('q') || '').toLowerCase()
    if (q) {
        items = items.filter((r) => (r.search_blob || '').includes(q))
    }

    const category = params.get('category')
    if (category && category !== 'all') {
        items = items.filter((r) => (r.category || '').toLowerCase() === category.toLowerCase())
    }

    const statusParam = params.get('warranty_status') || params.get('status')
    if (statusParam && statusParam !== 'all') {
        items = items.filter((r) => r.status === statusParam)
    }

    const sort = params.get('sort') || '-purchase_at'
    items.sort((a, b) => {
        const aDate = new Date(ensureIso(a.purchase_date, a.purchase_time)).getTime()
        const bDate = new Date(ensureIso(b.purchase_date, b.purchase_time)).getTime()
        const aTotal = toCents(a.total_amount)
        const bTotal = toCents(b.total_amount)

        switch (sort) {
            case 'purchase_at':
                return aDate - bDate
            case '-total_cents':
                return bTotal - aTotal
            case 'total_cents':
                return aTotal - bTotal
            case 'date_desc':
            case '-purchase_at':
            default:
                return bDate - aDate
        }
    })

    return items
}

function buildListResource(record, query) {
    const purchaseAt = ensureIso(record.purchase_date, record.purchase_time)
    return {
        type: 'receipt',
        id: record.id,
        attributes: {
            purchase_id: record.purchase_id,
            purchase_at: purchaseAt,
            merchant: record.merchant,
            total_cents: toCents(record.total_amount),
            currency: record.currency,
            warranty_status: record.status,
            extract_status: record.extract_status,
            snippet: buildSnippet(record, query),
        },
    }
}

function buildDetailAttributes(record) {
    const purchaseAt = ensureIso(record.purchase_date, record.purchase_time)
    const totalCents = toCents(record.total_amount)
    const lineItems = buildLineItems(record)
    const warranties = buildWarranties(record)
    return {
        purchase: {
            subtotal_cents: lineItems.reduce((sum, item) => sum + Number(item.line_total_cents ?? 0), 0) || totalCents,
            tax_cents: record.tax_cents ?? 0,
            tip_cents: record.tip_cents ?? 0,
            discount_cents: record.discount_cents ?? 0,
            total_cents: totalCents,
            currency: record.currency,
            payment_method_type: record.payment_method_type ?? 'card',
            status: record.purchase_status ?? 'posted',
            purchase_at: purchaseAt,
            posted_at: record.posted_at ?? purchaseAt,
        },
        merchant: {
            name: record.merchant,
            location_text: record.merchant_location ?? 'Online',
        },
        line_items: lineItems,
        warranties,
        receipt: {
            id: record.id,
            extract_status: record.extract_status,
            confidence_score: record.confidence_score ?? 0.96,
        },
        document_id: record.document_id,
    }
}

export const receiptHandlers = [
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
        const query = (params.get('q') || '').toLowerCase()

        return HttpResponse.json(
            {
                data: items.map((item) => buildListResource(item, query)),
                links: {
                    page,
                    page_size: pageSize,
                    total,
                },
            },
            { status: 200 },
        )
    }),

    http.get('/api/receipts/:id', ({ params }) => {
        const id = params.id
        const record = db.receipts.find((r) => r.id === id)
        if (!record) {
            return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        }
        return HttpResponse.json(
            {
                data: {
                    type: 'receipt_detail',
                    id: record.id,
                    attributes: buildDetailAttributes(record),
                },
            },
            { status: 200 },
        )
    }),

    http.post('/api/receipts', async ({ request }) => {
        try {
            const body = await request.json()
            const id = genId()
            const purchaseDate = body.purchase_date || new Date().toISOString().slice(0, 10)
            const purchaseTime = body.purchase_time || `${purchaseDate}T12:00:00Z`
            const warranty = body.warranty || {}
            const record = {
                id,
                title: body.title || body.product_name || 'Untitled',
                product_name: body.product_name || body.title || 'Unknown item',
                merchant: body.merchant || 'Unknown merchant',
                merchant_location: body.merchant_location || 'Online',
                purchase_date: purchaseDate,
                purchase_time: purchaseTime,
                purchase_id: body.purchase_id || `pur_${id}`,
                total_amount: Number(body.total_amount || 0),
                currency: body.currency || 'USD',
                category: body.category || 'general',
                tags: Array.isArray(body.tags) ? body.tags : [],
                serial_number: body.serial_number || '',
                order_number: body.order_number || '',
                warranty,
                warranties: body.warranties,
                status: statusFromWarranty(warranty),
                extract_status: 'processing',
                confidence_score: 0.5,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                payment_method_type: body.payment_method_type || 'card',
                purchase_status: body.purchase_status || 'posted',
                posted_at: body.posted_at || purchaseTime,
                line_items: body.line_items,
                attachments: [],
                document_id: `doc_${id}`,
                search_blob: buildSearchBlob(body),
            }
            db.receipts.unshift(record)
            return HttpResponse.json(
                {
                    data: {
                        type: 'receipt_detail',
                        id,
                        attributes: buildDetailAttributes(record),
                    },
                },
                { status: 201 },
            )
        } catch {
            return HttpResponse.json({ message: 'Bad request' }, { status: 400 })
        }
    }),

    http.put('/api/receipts/:id', async ({ params, request }) => {
        const id = params.id
        const idx = db.receipts.findIndex((r) => r.id === id)
        if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        const body = await request.json().catch(() => ({}))
        const existing = db.receipts[idx]
        const warranty = body.warranty ? { ...existing.warranty, ...body.warranty } : existing.warranty
        const updated = {
            ...existing,
            ...body,
            warranty,
            warranties: body.warranties ?? existing.warranties,
            status: statusFromWarranty(warranty),
            purchase_time: body.purchase_time || existing.purchase_time,
            purchase_date: body.purchase_date || existing.purchase_date,
            total_amount: Number(body.total_amount ?? existing.total_amount),
            currency: body.currency || existing.currency,
            category: body.category || existing.category,
            tags: Array.isArray(body.tags) ? body.tags : existing.tags,
            document_id: body.document_id || existing.document_id,
            updated_at: new Date().toISOString(),
        }
        updated.search_blob = buildSearchBlob(updated)
        db.receipts[idx] = updated
        return HttpResponse.json(
            {
                data: {
                    type: 'receipt_detail',
                    id: updated.id,
                    attributes: buildDetailAttributes(updated),
                },
            },
            { status: 200 },
        )
    }),

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
                type = (file.type || '').startsWith('image')
                    ? 'image'
                    : (file.name || '').toLowerCase().endsWith('.pdf')
                        ? 'pdf'
                        : 'file'
            }
        } catch {
            // ignore parsing issues when reading the mock file input
        }

        const attachment = {
            id: `${id}-att-${Math.random().toString(36).slice(2, 8)}`,
            filename,
            type,
            size,
            url:
                type === 'image'
                    ? `https://placehold.co/800x600?text=${encodeURIComponent(filename)}`
                    : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        }

        rec.attachments = rec.attachments || []
        rec.attachments.push(attachment)
        rec.updated_at = new Date().toISOString()

        await new Promise((resolve) => setTimeout(resolve, 300))
        return HttpResponse.json({ attachment }, { status: 201 })
    }),

    http.delete('/api/receipts/:id', ({ params }) => {
        const id = params.id
        const idx = db.receipts.findIndex((r) => r.id === id)
        if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        db.receipts.splice(idx, 1)
        return HttpResponse.json({ ok: true }, { status: 200 })
    }),

    http.post('/api/documents/:id/presign', ({ params }) => {
        const documentId = params.id
        return HttpResponse.json(
            {
                data: {
                    type: 'presigned_url',
                    id: `psu_${documentId}`,
                    attributes: {
                        url: `https://example.com/mock-${documentId}.pdf?expires=300`,
                        expires_in_seconds: 300,
                    },
                },
            },
            { status: 200 },
        )
    }),
]
