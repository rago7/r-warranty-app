import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile } from '../../features/profile/api'

const PrefsContext = createContext(null)

export default function PrefsProvider({ children }) {
    const qc = useQueryClient()
    const [prefs, setLocalPrefs] = useState(() => {
        try { return JSON.parse(localStorage.getItem('prefs') || 'null') || null } catch { return null }
    })

    const profileQuery = useQuery({
        queryKey: ['profile'],
        queryFn: getProfile,
        staleTime: 5 * 60_000,
    })

    useEffect(() => {
        if (profileQuery.data?.preferences) {
            setLocalPrefs(profileQuery.data.preferences)
            localStorage.setItem('prefs', JSON.stringify(profileQuery.data.preferences))
        }
    }, [profileQuery.data])

    const mutation = useMutation({
        mutationFn: (partial) => updateProfile({ preferences: { ...prefs, ...partial } }),
        onMutate: async (partial) => {
            const next = { ...(prefs || {}), ...(partial || {}) }
            // optimistic local apply
            setLocalPrefs(next)
            localStorage.setItem('prefs', JSON.stringify(next))
            const previous = qc.getQueryData(['profile'])
            qc.setQueryData(['profile'], (old) => ({ ...(old || {}), preferences: next }))
            return { previous }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(['profile'], ctx.previous)
        },
        onSuccess: (data) => {
            const next = data.preferences
            setLocalPrefs(next)
            localStorage.setItem('prefs', JSON.stringify(next))
            qc.setQueryData(['profile'], (old) => ({ ...(old || {}), preferences: next }))
        },
    })

    const value = useMemo(() => ({
        prefs: prefs || { currency: 'USD', timezone: 'UTC', locale: (typeof navigator !== 'undefined' ? navigator.language : 'en-US') },
        setPrefs: (partial) => mutation.mutate(partial),
        isSaving: mutation.isPending,
    }), [prefs, mutation])

    return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
    const ctx = useContext(PrefsContext)
    if (!ctx) throw new Error('usePrefs must be used within PrefsProvider')
    return ctx
}
