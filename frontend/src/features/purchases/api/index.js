import http from '../../../services/http'

export async function listPurchases(params = {}) {
  const { data } = await http.get('/purchases', { params })
  return data
}

export async function getPurchase(id) {
  const { data } = await http.get(`/purchases/${id}`)
  return data
}

export async function createPurchase(payload) {
  const { data } = await http.post('/purchases', payload)
  return data
}

export async function updatePurchase(id, payload) {
  const { data } = await http.put(`/purchases/${id}`, payload)
  return data
}

export async function uploadPurchaseAttachment(id, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post(`/purchases/${id}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function uploadLineItemAttachment(purchaseId, lineItemId, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post(`/purchases/${purchaseId}/line_items/${lineItemId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deletePurchase(id) {
  const { data } = await http.delete(`/purchases/${id}`)
  return data
}
