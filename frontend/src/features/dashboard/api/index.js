import http from '../../../services/http'

export async function getDashboardSummary() {
    const { data } = await http.get('/dashboard/summary')
    return data
}