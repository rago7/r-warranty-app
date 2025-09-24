import { useState } from 'react'
import { useAuth } from '../../../app/providers/AuthProvider.jsx'
import useTitle from '../../../lib/useTitle'

export default function LoginPage() {
    useTitle('Login')
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    async function onSubmit(e) {
        e.preventDefault()
        setError('')
        try {
            await login(email, password)
        } catch (e) {
            setError(e?.message || 'Login failed')
        }
    }

    return (
        <div className="mx-auto grid max-w-md gap-4 rounded-xl border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-bold">Sign in</h1>
            <form onSubmit={onSubmit} className="grid gap-3">
                <label className="grid gap-1 text-sm">
                    <span className="font-medium">Email</span>
                    <input className="rounded-lg border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                    <span className="font-medium">Password</span>
                    <input type="password" className="rounded-lg border border-slate-300 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                {error && <div className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{error}</div>}
                <button className="rounded-lg border border-slate-200 bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700">Sign in</button>
            </form>
        </div>
    )
}
