import http from '../../../services/http'

export async function getProfile() {
    const { data } = await http.get('/profile')
    return data // { id, email, name, preferences: { currency, timezone, locale } }
}

export async function updateProfile(payload) {
    const { data } = await http.put('/profile', payload)
    return data
}

export async function changePassword(payload) {
    const { data } = await http.post('/profile/change-password', payload)
    return data
}