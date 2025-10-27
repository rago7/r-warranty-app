import http from '../../../services/http'

export const listReceipts = (params) => http.get('/receipts', { params }).then((response) => response.data)

export const getReceipt = (id) => http.get(`/receipts/${id}`).then((response) => response.data)

export const presignDocument = (documentId) =>
    http.post(`/documents/${documentId}/presign`).then((response) => response.data)

export const createReceipt = (payload) => http.post('/receipts', payload).then((response) => response.data)

export const updateReceipt = (id, payload) => http.put(`/receipts/${id}`, payload).then((response) => response.data)

export const uploadReceiptAttachment = (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return http
        .post(`/receipts/${id}/attachments`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((response) => response.data)
}

export const deleteReceipt = (id) => http.delete(`/receipts/${id}`).then((response) => response.data)
