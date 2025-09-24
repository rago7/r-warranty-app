import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import useTitle from '../../../lib/useTitle'

export default function LoginPage() {
    useTitle('Login')

    const { user, login, isLoading } = useAuth()
    const navigate = useNavigate()
    const [sp] = useSearchParams()
    const nextParam = sp.get('next')
    const next = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // If already authenticated, bounce away from the login page
    useEffect(() => {
        if (user) {
            navigate(next, { replace: true })
        }
    }, [user, next, navigate])

    async function onSubmit(e) {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            await login(email, password)     // sets token/user in AuthProvider
            navigate(next, { replace: true }) // go to intended page (or /dashboard)
        } catch (err) {
            setError(err?.message || 'Login failed')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="mx-auto grid max-w-md gap-4 rounded-xl border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-bold">Sign in</h1>

            <form onSubmit={onSubmit} className="grid gap-3">
                <label className="grid gap-1 text-sm">
                    <span className="font-medium">Email</span>
                    <input
                        className="rounded-lg border border-slate-300 px-3 py-2"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                    />
                </label>

                <label className="grid gap-1 text-sm">
                    <span className="font-medium">Password</span>
                    <input
                        type="password"
                        className="rounded-lg border border-slate-300 px-3 py-2"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </label>

                {error && (
                    <div className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting || isLoading}
                    className="rounded-lg border border-slate-200 bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {submitting ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </div>
    )
}
