import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getMe, login as loginApi, logout as logoutApi } from '../../features/auth/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const qc = useQueryClient()
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // Load persisted auth on boot
    useEffect(() => {
        try {
            const t = localStorage.getItem('token')
            const u = localStorage.getItem('user')
            if (t) setToken(t)
            if (u) setUser(JSON.parse(u))
        } catch {}
        setIsLoading(false)
    }, [])

    // Optionally revalidate the user when token changes (mock /me)
    useEffect(() => {
        let cancelled = false
        async function revalidate() {
            if (!token) return
            try {
                const me = await getMe()
                if (!cancelled) {
                    setUser(me)
                    localStorage.setItem('user', JSON.stringify(me))
                }
            } catch {
                // token invalid → clear
                if (!cancelled) {
                    doLogout(false)
                }
            }
        }
        revalidate()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    function persist(t, u) {
        try {
            localStorage.setItem('token', t)
            localStorage.setItem('user', JSON.stringify(u))
        } catch {}
    }

    async function doLogin(email, password) {
        const { token: t, user: u } = await loginApi(email, password)
        setToken(t)
        setUser(u)
        persist(t, u)
        return u
    }

    async function doLogout(callApi = true) {
        try {
            if (callApi) await logoutApi()
        } catch {}
        try {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
        } catch {}
        setToken(null)
        setUser(null)
        qc.clear()
    }

    const value = useMemo(() => ({
        user,
        token,
        isLoading,
        login: doLogin,
        logout: doLogout,
    }), [user, token, isLoading])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
