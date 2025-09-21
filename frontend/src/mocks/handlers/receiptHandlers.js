import { http, HttpResponse } from 'msw'
import dataset from '../fixtures/receipts.json'


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


export const receiptHandlers = [
// GET /api/receipts?query=&merchant=&category=&tag=&from=&to=&sort=&page=&page_size=
    http.get('/api/receipts', ({ request }) => {
        const url = new URL(request.url)
        const params = url.searchParams


        const page = Number(params.get('page') || '1')
        const pageSize = Number(params.get('page_size') || '10')


        const filtered = filterAndSort(dataset.receipts, params)
        const total = filtered.length
        const start = (page - 1) * pageSize
        const end = start + pageSize


        const items = filtered.slice(start, end)


        return HttpResponse.json({ items, total, page, page_size: pageSize }, { status: 200 })
    }),
]