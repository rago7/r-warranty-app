import http from '../../../services/http'

export const getDashboardSummary = (params) =>
    http.get('/dashboard/summary', { params }).then((response) => response.data)
