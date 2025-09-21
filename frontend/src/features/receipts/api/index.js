import http from '../../../services/http'


export async function listReceipts(params = {}) {
    const { data } = await http.get('/receipts', { params })
    return data // { items, total, page, page_size }
}