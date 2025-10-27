import { http, HttpResponse } from 'msw'
import dataset from '../fixtures/receipts.json'

const merchantsIndex = {
    mrc_apple: { id: 'mrc_apple', name: 'Apple Store', location_text: 'Online' },
    mrc_best_buy: { id: 'mrc_best_buy', name: 'Best Buy', location_text: 'Online' },
    mrc_home_depot: { id: 'mrc_home_depot', name: 'Home Depot', location_text: 'Online' },
    mrc_williams_sonoma: { id: 'mrc_williams_sonoma', name: 'Williams Sonoma', location_text: 'Online' },
    mrc_nike: { id: 'mrc_nike', name: 'Nike Store', location_text: 'Online' },
    mrc_target: { id: 'mrc_target', name: 'Target', location_text: 'Online' },
    mrc_generic: { id: 'mrc_generic', name: 'General Merchant', location_text: 'Online' },
}

const MONEY_FACTOR = 100
const todayIso = () => new Date().toISOString()

function moneyToCents(value) {
    const num = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    if (!Number.isFinite(num)) return 0
    return Math.round(num * MONEY_FACTOR)
}

function centsToMoney(value) {
    const cents = Number(value)
    if (!Number.isFinite(cents)) return 0
    return cents / MONEY_FACTOR
}

function ensureIso(date, time) {
    if (!date && !time) return todayIso()
    if (date && time && time.includes('T')) {
        const iso = new Date(time)
        if (!Number.isNaN(iso.getTime())) return iso.toISOString()
    }
    if (date && time) {
        const iso = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}`)
        if (!Number.isNaN(iso.getTime())) return iso.toISOString()
    }
    if (date) {
        const iso = new Date(`${date}T12:00:00`)
        if (!Number.isNaN(iso.getTime())) return iso.toISOString()
    }
    if (time) {
        const iso = new Date(time)
        if (!Number.isNaN(iso.getTime())) return iso.toISOString()
    }
    return todayIso()
}

function slugify(value) {
    return (value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

const counters = {
    receipt: 2000,
    purchase: 2000,
    lineItem: 5000,
    warranty: 7000,
    attachment: 9000,
    document: 11000,
}

function nextId(key) {
    counters[key] += 1
    return counters[key]
}

function resolveMerchant(merchantId, merchantName) {
    let id = merchantId
    if (!id && merchantName) {
        const slug = slugify(merchantName)
        id = slug ? `mrc_${slug}` : 'mrc_generic'
    }
    if (!id) id = 'mrc_generic'
    if (!merchantsIndex[id]) {
        merchantsIndex[id] = { id, name: merchantName || 'Unknown merchant', location_text: 'Online' }
    }
    const entry = merchantsIndex[id]
    if (merchantName && !entry.name) {
        entry.name = merchantName
    }
    return entry
}

function aggregateWarrantyStatus(record) {
    const horizon = new Date()
    const warranties = []
    if (record.purchase_level_warranty) warranties.push(record.purchase_level_warranty)
    for (const item of record.line_items) {
        if (item.warranty_applicable && item.warranty) warranties.push(item.warranty)
    }
    if (warranties.length === 0) return 'unknown'
    const active = warranties.some((w) => {
        if (!w?.end_date) return false
        const end = new Date(w.end_date)
        return !Number.isNaN(end.getTime()) && end.getTime() >= horizon.getTime()
    })
    return active ? 'in_warranty' : 'expired'
}

function buildSearchBlob(record) {
    const parts = [
        record.merchant?.name,
        record.purchase?.notes,
        ...record.line_items.map((item) => item.name),
        ...record.line_items.map((item) => item.category_id),
    ]
    return parts
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
}

function buildSnippet(record, query) {
    if (!query) return null
    const lc = query.toLowerCase()
    if ((record.merchant?.name || '').toLowerCase().includes(lc)) {
        return `Merchant match: ${record.merchant.name}`
    }
    const item = record.line_items.find((it) => (it.name || '').toLowerCase().includes(lc))
    if (item) return `Item match: ${item.name}`
    const category = record.line_items.find((it) => (it.category_id || '').toLowerCase().includes(lc))
    if (category) return `Category match: ${category.category_id}`
    if ((record.purchase?.notes || '').toLowerCase().includes(lc)) {
        return 'Notes match'
    }
    return null
}

function mapSeedLineItem(seed) {
    const id = seed?.id ?? `lin_${nextId('lineItem')}`
    const quantity = seed?.quantity != null ? Number(seed.quantity) : 1
    const unitCents = seed?.unit_price_cents ?? moneyToCents(seed?.unit_price ?? seed?.line_total ?? 0)
    const totalCents = seed?.line_total_cents ?? unitCents * quantity
    const warranty = seed?.warranty
        ? {
              id: seed.warranty.id ?? `war_${nextId('warranty')}`,
              type: seed.warranty.type ?? 'manufacturer',
              provider: seed.warranty.provider ?? '',
              policy_number: seed.warranty.policy_number ?? '',
              start_date: seed.warranty.start_date ?? null,
              end_date: seed.warranty.end_date ?? null,
              terms_url: seed.warranty.terms_url ?? '',
              coverage_notes: seed.warranty.coverage_notes ?? '',
              warranty_doc_id: seed.warranty.warranty_doc_id ?? null,
              level: 'item',
              line_item_id: id,
          }
        : null
    return {
        id,
        name: seed?.name ?? seed?.title ?? 'Item',
        quantity: Number.isFinite(quantity) ? quantity : 1,
        unit_price_cents: unitCents,
        line_total_cents: totalCents,
        category_id: seed?.category_id ?? seed?.category ?? 'cat_general',
        returnable_until: seed?.returnable_until ?? null,
        warranty_applicable: Boolean(seed?.warranty_applicable ?? warranty),
        warranty,
    }
}

function adaptSeedReceipt(seed) {
    const id = seed?.id ?? `rcp_${nextId('receipt')}`
    const merchant = resolveMerchant(seed?.merchant_id, seed?.merchant)
    const purchaseDate = seed?.purchase_date ?? todayIso().slice(0, 10)
    const purchaseTime = seed?.purchase_time ?? null
    const purchaseAt = ensureIso(purchaseDate, purchaseTime)
    const lineItems = Array.isArray(seed?.line_items) && seed.line_items.length > 0
        ? seed.line_items.map((item) => mapSeedLineItem(item))
        : [mapSeedLineItem({ ...seed, id: `${id}-li` })]
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.line_total_cents ?? 0), 0)
    const tax = seed?.tax_cents ?? moneyToCents(seed?.tax ?? 0)
    const tip = seed?.tip_cents ?? moneyToCents(seed?.tip ?? 0)
    const discount = seed?.discount_cents ?? moneyToCents(seed?.discount ?? 0)
    const total = seed?.total_cents ?? moneyToCents(seed?.total_amount ?? subtotal / MONEY_FACTOR)
    const purchase = {
        id: seed?.purchase_id ?? `pur_${nextId('purchase')}`,
        merchant_id: merchant.id,
        purchase_at: purchaseAt,
        currency: seed?.currency ?? 'USD',
        subtotal_cents: subtotal,
        tax_cents: tax,
        tip_cents: tip,
        discount_cents: discount,
        total_cents: total,
        payment_method_type: seed?.payment_method_type ?? 'card',
        status: seed?.purchase_status ?? 'posted',
        notes: seed?.notes ?? '',
    }
    const purchaseWarranty = seed?.purchase_level_warranty
        ? {
              id: seed.purchase_level_warranty.id ?? `war_${nextId('warranty')}`,
              type: seed.purchase_level_warranty.type ?? 'manufacturer',
              provider: seed.purchase_level_warranty.provider ?? '',
              policy_number: seed.purchase_level_warranty.policy_number ?? '',
              start_date: seed.purchase_level_warranty.start_date ?? null,
              end_date: seed.purchase_level_warranty.end_date ?? null,
              terms_url: seed.purchase_level_warranty.terms_url ?? '',
              coverage_notes: seed.purchase_level_warranty.coverage_notes ?? '',
              warranty_doc_id: seed.purchase_level_warranty.warranty_doc_id ?? null,
              level: 'purchase',
          }
        : seed?.warranty
            ? {
                  id: seed.warranty.id ?? `war_${nextId('warranty')}`,
                  type: seed.warranty.type ?? 'manufacturer',
                  provider: seed.warranty.provider ?? '',
                  policy_number: seed.warranty.policy_number ?? '',
                  start_date: seed.warranty.start_date ?? null,
                  end_date: seed.warranty.end_date ?? null,
                  terms_url: seed.warranty.terms_url ?? '',
                  coverage_notes: seed.warranty.coverage_notes ?? '',
                  warranty_doc_id: seed.warranty.warranty_doc_id ?? null,
                  level: 'purchase',
              }
            : null
    const record = {
        id,
        purchase,
        merchant,
        line_items: lineItems,
        purchase_level_warranty: purchaseWarranty,
        document_id: seed?.document_id ?? `doc_${id}`,
        extract_status: seed?.extract_status ?? 'success',
        confidence_score: seed?.confidence_score ?? 0.96,
        attachments: Array.isArray(seed?.attachments) ? seed.attachments : [],
        created_at: seed?.created_at ?? todayIso(),
        updated_at: seed?.updated_at ?? todayIso(),
    }
    record.warranty_status = aggregateWarrantyStatus(record)
    record.search_blob = buildSearchBlob(record)
    return record
}

const db = {
    receipts: (dataset?.receipts || []).map((seed) => adaptSeedReceipt(seed)),
}

function mapLineItemForResponse(item) {
    return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        line_total_cents: item.line_total_cents,
        category_id: item.category_id,
        returnable_until: item.returnable_until,
        warranty_applicable: item.warranty_applicable,
        warranty: item.warranty
            ? {
                  ...item.warranty,
              }
            : null,
    }
}

function buildWarranties(record) {
    const warranties = []
    if (record.purchase_level_warranty) {
        warranties.push({
            id: record.purchase_level_warranty.id,
            type: record.purchase_level_warranty.type,
            provider: record.purchase_level_warranty.provider,
            end_date: record.purchase_level_warranty.end_date,
            level: 'purchase',
        })
    }
    for (const item of record.line_items) {
        if (item.warranty_applicable && item.warranty) {
            warranties.push({
                id: item.warranty.id,
                type: item.warranty.type,
                provider: item.warranty.provider,
                end_date: item.warranty.end_date,
                level: 'item',
                line_item_id: item.id,
            })
        }
    }
    return warranties
}

function buildDetailAttributes(record) {
    return {
        purchase: {
            ...record.purchase,
        },
        merchant: {
            id: record.merchant.id,
            name: record.merchant.name,
            location_text: record.merchant.location_text,
        },
        line_items: record.line_items.map((item) => mapLineItemForResponse(item)),
        purchase_level_warranty: record.purchase_level_warranty || null,
        warranties: buildWarranties(record),
        receipt: {
            id: record.id,
            extract_status: record.extract_status,
            confidence_score: record.confidence_score,
        },
        document_id: record.document_id,
        attachments: record.attachments,
    }
}

function buildListResource(record, query) {
    return {
        type: 'receipt',
        id: record.id,
        attributes: {
            purchase_id: record.purchase.id,
            purchase_at: record.purchase.purchase_at,
            merchant: record.merchant.name,
            total_cents: record.purchase.total_cents,
            currency: record.purchase.currency,
            warranty_status: record.warranty_status,
            extract_status: record.extract_status,
            snippet: buildSnippet(record, query),
        },
    }
}

function filterReceipts(params) {
    const query = (params.get('q') || '').toLowerCase()
    const category = params.get('category')
    const status = params.get('warranty_status') || params.get('status')
    const sort = params.get('sort') || '-purchase_at'

    let list = [...db.receipts]
    if (query) {
        list = list.filter((record) => record.search_blob.includes(query))
    }
    if (category && category !== 'all') {
        list = list.filter((record) =>
            record.line_items.some((item) => (item.category_id || '').toLowerCase() === category.toLowerCase()),
        )
    }
    if (status && status !== 'all') {
        list = list.filter((record) => record.warranty_status === status)
    }

    list.sort((a, b) => {
        const aDate = new Date(a.purchase.purchase_at).getTime()
        const bDate = new Date(b.purchase.purchase_at).getTime()
        const aTotal = a.purchase.total_cents
        const bTotal = b.purchase.total_cents
        switch (sort) {
            case 'purchase_at':
                return aDate - bDate
            case '-total_cents':
                return bTotal - aTotal
            case 'total_cents':
                return aTotal - bTotal
            case '-purchase_at':
            default:
                return bDate - aDate
        }
    })

    return list
}

function normalizeLineItemPayload(item) {
    const id = item.id ?? `lin_${nextId('lineItem')}`
    const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1
    const unitCents = moneyToCents(item.unit_price ?? item.unitPrice ?? centsToMoney(item.unit_price_cents ?? 0))
    const lineTotalCents = moneyToCents(item.line_total ?? item.lineTotal ?? unitCents / MONEY_FACTOR * quantity)
    const warrantyPayload = item.warranty
        ? {
              id: item.warranty.id ?? `war_${nextId('warranty')}`,
              type: item.warranty.type ?? 'manufacturer',
              provider: item.warranty.provider ?? '',
              policy_number: item.warranty.policy_number ?? '',
              start_date: item.warranty.start_date ?? null,
              end_date: item.warranty.end_date ?? null,
              terms_url: item.warranty.terms_url ?? '',
              coverage_notes: item.warranty.coverage_notes ?? '',
              warranty_doc_id: item.warranty.warranty_doc_id ?? null,
              level: 'item',
              line_item_id: id,
          }
        : null
    return {
        id,
        name: item.name || 'Item',
        quantity,
        unit_price_cents: unitCents,
        line_total_cents: lineTotalCents,
        category_id: item.category_id ?? null,
        returnable_until: item.returnable_until ?? null,
        warranty_applicable: Boolean(item.warranty_applicable ?? (item.warranty && true)),
        warranty: warrantyPayload,
    }
}

function normalizePurchaseWarranty(payload) {
    if (!payload) return null
    return {
        id: payload.id ?? `war_${nextId('warranty')}`,
        type: payload.type ?? 'manufacturer',
        provider: payload.provider ?? '',
        policy_number: payload.policy_number ?? '',
        start_date: payload.start_date ?? null,
        end_date: payload.end_date ?? null,
        terms_url: payload.terms_url ?? '',
        coverage_notes: payload.coverage_notes ?? '',
        warranty_doc_id: payload.warranty_doc_id ?? null,
        level: 'purchase',
    }
}

function buildRecordFromPayload(body) {
    const purchasePayload = body?.purchase ?? {}
    const merchantInfo = resolveMerchant(
        purchasePayload.merchant_id,
        purchasePayload.merchant_name ?? purchasePayload.merchantName ?? body?.merchant_name,
    )
    const lineItemsPayload = Array.isArray(body?.line_items) ? body.line_items : []
    const lineItems = lineItemsPayload.length > 0
        ? lineItemsPayload.map((item) => normalizeLineItemPayload(item))
        : [normalizeLineItemPayload({ name: 'Item', quantity: 1, unit_price: 0, line_total: 0 })]
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.line_total_cents ?? 0), 0)
    const tax = moneyToCents(purchasePayload.tax)
    const tip = moneyToCents(purchasePayload.tip)
    const discount = moneyToCents(purchasePayload.discount)
    const total = moneyToCents(purchasePayload.total)
    let purchaseAt = purchasePayload.purchase_at
    if (purchaseAt) {
        const date = new Date(purchaseAt)
        purchaseAt = Number.isNaN(date.getTime()) ? todayIso() : date.toISOString()
    } else {
        purchaseAt = todayIso()
    }
    const purchase = {
        id: purchasePayload.id ?? `pur_${nextId('purchase')}`,
        merchant_id: merchantInfo.id,
        purchase_at: purchaseAt,
        currency: purchasePayload.currency ?? 'USD',
        subtotal_cents: subtotal,
        tax_cents: tax,
        tip_cents: tip,
        discount_cents: discount,
        total_cents: total || subtotal + tax + tip - discount,
        payment_method_type: purchasePayload.payment_method_type ?? 'card',
        status: purchasePayload.status ?? 'posted',
        notes: purchasePayload.notes ?? '',
    }
    const purchaseWarranty = normalizePurchaseWarranty(body?.purchase_level_warranty)
    return {
        id: body?.id ?? `rcp_${nextId('receipt')}`,
        purchase,
        merchant: merchantInfo,
        line_items: lineItems,
        purchase_level_warranty: purchaseWarranty,
        document_id: body?.document_id ?? `doc_${nextId('document')}`,
        extract_status: body?.extract_status ?? 'processing',
        confidence_score: 0.5,
        attachments: [],
        created_at: todayIso(),
        updated_at: todayIso(),
    }
}

export const receiptsDb = db

export const receiptHandlers = [
    http.get('/api/receipts', ({ request }) => {
        const url = new URL(request.url)
        const params = url.searchParams
        const page = Number(params.get('page') || '1')
        const pageSize = Number(params.get('page_size') || '10')
        const filtered = filterReceipts(params)
        const total = filtered.length
        const start = (page - 1) * pageSize
        const end = start + pageSize
        const items = filtered.slice(start, end)
        const query = (params.get('q') || '').toLowerCase()
        return HttpResponse.json(
            {
                data: items.map((record) => buildListResource(record, query)),
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
        const record = db.receipts.find((entry) => entry.id === params.id)
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
            const record = buildRecordFromPayload(body)
            record.warranty_status = aggregateWarrantyStatus(record)
            record.search_blob = buildSearchBlob(record)
            db.receipts.unshift(record)
            return HttpResponse.json(
                {
                    data: {
                        type: 'receipt_detail',
                        id: record.id,
                        attributes: buildDetailAttributes(record),
                    },
                },
                { status: 201 },
            )
        } catch {
            return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 })
        }
    }),

    http.put('/api/receipts/:id', async ({ params, request }) => {
        const id = params.id
        const index = db.receipts.findIndex((entry) => entry.id === id)
        if (index === -1) {
            return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        }
        try {
            const body = await request.json()
            const existing = db.receipts[index]
            const incoming = buildRecordFromPayload({ ...body, id })
            const updated = {
                ...existing,
                ...incoming,
                purchase: { ...existing.purchase, ...incoming.purchase },
                merchant: incoming.merchant,
                line_items: incoming.line_items,
                purchase_level_warranty: incoming.purchase_level_warranty,
                document_id: incoming.document_id ?? existing.document_id,
                extract_status: existing.extract_status,
                attachments: existing.attachments,
                created_at: existing.created_at,
                updated_at: todayIso(),
            }
            updated.warranty_status = aggregateWarrantyStatus(updated)
            updated.search_blob = buildSearchBlob(updated)
            db.receipts[index] = updated
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
        } catch {
            return HttpResponse.json({ message: 'Invalid payload' }, { status: 400 })
        }
    }),

    http.post('/api/receipts/:id/attachments', async ({ params, request }) => {
        const record = db.receipts.find((entry) => entry.id === params.id)
        if (!record) {
            return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        }
        let filename = 'file'
        let size = 0
        let type = 'file'
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
            // ignore parsing errors
        }
        const attachment = {
            id: `att_${nextId('attachment')}`,
            filename,
            type,
            size,
            url:
                type === 'image'
                    ? `https://placehold.co/800x600?text=${encodeURIComponent(filename)}`
                    : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        }
        record.attachments = record.attachments || []
        record.attachments.push(attachment)
        record.updated_at = todayIso()
        return HttpResponse.json({ attachment }, { status: 201 })
    }),

    http.delete('/api/receipts/:id', ({ params }) => {
        const index = db.receipts.findIndex((entry) => entry.id === params.id)
        if (index === -1) {
            return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        }
        db.receipts.splice(index, 1)
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
