import { http, HttpResponse } from 'msw'
import fixture from '../fixtures/profile.json'

let profile = { ...fixture }

export const profileHandlers = [
    http.get('/api/profile', () => {
        return HttpResponse.json(profile, { status: 200 })
    }),
    http.put('/api/profile', async ({ request }) => {
        const body = await request.json().catch(() => ({}))
        profile = { ...profile, ...body, preferences: { ...profile.preferences, ...(body.preferences || {}) } }
        return HttpResponse.json(profile, { status: 200 })
    }),
    http.post('/api/profile/change-password', async ({ request }) => {
        const body = await request.json().catch(() => ({}))
        if (!body.current || !body.next) {
            return HttpResponse.json({ message: 'Missing fields' }, { status: 400 })
        }
        // mock success unless next too short
        if (String(body.next).length < 6) {
            return HttpResponse.json({ message: 'Password too short' }, { status: 400 })
        }
        return HttpResponse.json({ ok: true }, { status: 200 })
    })
]
