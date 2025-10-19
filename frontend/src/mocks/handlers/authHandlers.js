import { http, HttpResponse } from 'msw'
import usersFixture from '../fixtures/users.json'

// Very tiny in-memory auth store
const users = (usersFixture?.users || []).map(u => ({ ...u }))
const tokens = new Map() // token -> userId

function makeToken(userId) {
    const tok = `dev_${userId}_${Math.random().toString(36).slice(2, 10)}`
    tokens.set(tok, userId)
    return tok
}

function userPublic(u) {
    const { password, ...rest } = u
    return rest
}

function getUserFromAuth(req) {
    const auth = req.headers.get('authorization') || ''
    const m = auth.match(/^Bearer (.+)$/i)
    if (!m) return null
    const token = m[1]

    // First try in-memory issued tokens
    let userId = tokens.get(token)

    // Fallback: derive userId from stable dev token format so reloads keep auth
    if (!userId) {
        const m2 = token.match(/^dev_([^_]+)/)
        if (m2) userId = m2[1]
    }

    if (!userId) return null
    return users.find(u => u.id === userId) || null
}

export const authHandlers = [
    // POST /auth/login
    http.post('/api/auth/login', async ({ request }) => {
        let body = {}
        try {
            body = await request.json()
        } catch {
            return HttpResponse.json({ message: 'Invalid JSON' }, { status: 400 })
        }
        const email = String(body.email || '').toLowerCase().trim()
        const password = String(body.password || '')

        const u = users.find(x => x.email.toLowerCase() === email)
        if (!u || u.password !== password) {
            return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })
        }

        const token = makeToken(u.id)
        return HttpResponse.json({ token, user: userPublic(u) }, { status: 200 })
    }),

    // POST /auth/logout
    http.post('/api/auth/logout', async ({ request }) => {
        const auth = request.headers.get('authorization') || ''
        const m = auth.match(/^Bearer (.+)$/i)
        if (m) {
            tokens.delete(m[1])
        }
        return HttpResponse.json({ ok: true }, { status: 200 })
    }),

    // GET /me  (validate current token and return user)
    http.get('/api/me', ({ request }) => {
        const u = getUserFromAuth(request)
        if (!u) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        return HttpResponse.json(userPublic(u), { status: 200 })
    }),
]
