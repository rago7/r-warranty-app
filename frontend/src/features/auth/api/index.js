import http from '../../../services/http'

export async function login(email, password) {
    const { data } = await http.post('/auth/login', { email, password })
    return data // { token, user }
}

export async function getMe() {
    const { data } = await http.get('/me')
    return data // { id, name, email, role }
}

export async function logout() {
    const { data } = await http.post('/auth/logout')
    return data // { ok: true }
}
