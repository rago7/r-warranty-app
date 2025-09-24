import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile, changePassword } from '../api'
import Input from '../../../components/forms/Input'
import Select from '../../../components/forms/Select'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'
import { useToast } from '../../../app/providers/ToastProvider.jsx'
import useTitle from '../../../lib/useTitle'

const TZ_OPTS = [
    'America/Indiana/Indianapolis',
    'UTC','America/New_York','America/Los_Angeles','Europe/London','Asia/Kolkata',
].map((t) => ({ value: t, label: t }))
const CURR_OPTS = ['USD','EUR','INR','GBP'].map((c) => ({ value: c, label: c }))

export default function ProfilePage() {
    useTitle('Profile & Settings')
    const { toast } = useToast()
    const qc = useQueryClient()
    const { prefs, setPrefs, isSaving } = usePrefs()

    const { data, isLoading, isError, error } = useQuery({ queryKey: ['profile'], queryFn: getProfile })
    const prof = data || { name: '', email: '', preferences: prefs }

    const profileMut = useMutation({
        mutationFn: (payload) => updateProfile(payload),
        onSuccess: (next) => { qc.setQueryData(['profile'], next); toast({ title: 'Profile updated', variant: 'success' }) },
        onError: (e) => toast({ title: 'Update failed', description: e?.message || 'Unknown error', variant: 'error' })
    })

    const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
    const pwMut = useMutation({
        mutationFn: () => changePassword(pw),
        onSuccess: () => { toast({ title: 'Password updated', variant: 'success' }); setPw({ current: '', next: '', confirm: '' }) },
        onError: (e) => toast({ title: 'Password not updated', description: e?.message || 'Unknown error', variant: 'error' })
    })

    if (isLoading) return <div className="grid gap-3"><div className="h-8 animate-pulse rounded bg-slate-200" /><div className="h-40 animate-pulse rounded bg-slate-200" /></div>
    if (isError) return <div className="rounded border border-rose-200 bg-rose-50 p-4 text-rose-800">Failed to load profile: {error?.message || 'Unknown error'}</div>

    return (
        <div className="grid gap-5">
            <h1 className="text-xl font-bold">Profile & Settings</h1>

            {/* Account */}
            <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Account</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input label="Name" value={prof.name} onChange={(e) => profileMut.mutate({ name: e.target.value })} />
                    <Input label="Email" value={prof.email} disabled />
                </div>
            </section>

            {/* Preferences */}
            <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Preferences</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Select label="Timezone" options={TZ_OPTS} value={prefs.timezone} onChange={(e) => setPrefs({ timezone: e.target.value })} />
                    <Select label="Currency" options={CURR_OPTS} value={prefs.currency} onChange={(e) => setPrefs({ currency: e.target.value })} />
                    <Input label="Locale" value={prefs.locale || ''} onChange={(e) => setPrefs({ locale: e.target.value })} hint="e.g., en-US, fr-FR" />
                </div>
                <div className="mt-2 text-xs text-slate-500">{isSaving ? 'Saving…' : 'Saved'}</div>
            </section>

            {/* Security */}
            <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">Security</h2>
                <form
                    className="mt-3 grid gap-3 sm:max-w-md"
                    onSubmit={(e) => { e.preventDefault(); if (pw.next !== pw.confirm) { return toast({ title: 'Passwords do not match', variant: 'error' }) } pwMut.mutate(); }}
                >
                    <Input label="Current password" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                    <Input label="New password" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                    <Input label="Confirm new password" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                    <div>
                        <button type="submit" disabled={pwMut.isPending} className="rounded-lg border border-slate-200 bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">
                            {pwMut.isPending ? 'Updating…' : 'Update password'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    )
}
