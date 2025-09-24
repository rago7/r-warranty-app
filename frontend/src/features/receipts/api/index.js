import http from '../../../services/http'

export async function listReceipts(params = {}) {
    const { data } = await http.get('/receipts', { params })
    return data
}

export async function getReceipt(id) {
    const { data } = await http.get(`/receipts/${id}`)
    return data
}

export async function createReceipt(payload) {
    const { data } = await http.post('/receipts', payload)
    return data
}

export async function updateReceipt(id, payload) {
    const { data } = await http.put(`/receipts/${id}`, payload)
    return data
}

export async function uploadReceiptAttachment(id, file) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await http.post(`/receipts/${id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
}

export async function deleteReceipt(id) {
    const { data } = await http.delete(`/receipts/${id}`)
    return data // { ok: true }
}
