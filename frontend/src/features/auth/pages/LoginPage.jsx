import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import useTitle from '../../../lib/useTitle'

export default function LoginPage() {
    useTitle('Login')

    const { user, login, isLoading } = useAuth()
    const navigate = useNavigate()
    const [sp] = useSearchParams()

    // Sanitize `next`: must start with "/" and must NOT be an /auth path
    const rawNext = sp.get('next') || '/dashboard'
    const candidate = rawNext.startsWith('/') ? rawNext : '/dashboard'
    const next = candidate.startsWith('/auth/') ? '/dashboard' : candidate

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showPwd, setShowPwd] = useState(false)

    // If already authenticated, bounce away from the login page
    useEffect(() => {
        if (user) navigate(next, { replace: true })
    }, [user, next, navigate])

    async function onSubmit(e) {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            await login(email, password)        // sets token & user
            navigate(next, { replace: true })   // go to intended page
        } catch (err) {
            setError(err?.message || 'Login failed')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="grid min-h-dvh place-items-center px-4">
            <div className="w-full max-w-md rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow">
                <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
                <p className="mt-1 text-sm text-[rgb(var(--muted-fg))]">Access your receipts and warranties securely.</p>
                <form onSubmit={onSubmit} className="mt-4 grid gap-3">
                    <label className="grid gap-1 text-sm">
                        <span className="font-medium">Email</span>
                        <input
                            className="w-full rounded-lg border border-[rgb(var(--border))] bg-white px-3 py-2 text-[rgb(var(--fg))] placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="username"
                            inputMode="email"
                            required
                        />
                    </label>
                    <label className="grid gap-1 text-sm">
                        <span className="font-medium">Password</span>
                        <div className="flex items-stretch gap-2">
                            <input
                                type={showPwd ? 'text' : 'password'}
                                className="w-full rounded-lg border border-[rgb(var(--border))] bg-white px-3 py-2 text-[rgb(var(--fg))] placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(v => !v)}
                                className="btn btn-outline btn-sm shrink-0"
                                aria-pressed={showPwd}
                                aria-label={showPwd ? 'Hide password' : 'Show password'}
                            >
                                {showPwd ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <span className="mt-1 text-xs text-[rgb(var(--muted-fg))]">Use a strong password and keep it private.</span>
                    </label>
                    {error && (
                        <div className="rounded-lg border border-[rgb(var(--danger)/0.3)] bg-[rgb(var(--danger)/0.1)] p-2 text-sm text-[rgb(var(--danger))]">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={submitting || isLoading}
                        className="btn btn-primary w-full"
                    >
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                    <div className="mt-1 text-xs text-[rgb(var(--muted-fg))]">
                        Trouble signing in? <a href="mailto:support@warranty.test" className="font-medium text-[rgb(var(--primary))] hover:underline">Contact support</a>.
                    </div>
                </form>
            </div>
        </div>
    )
}
