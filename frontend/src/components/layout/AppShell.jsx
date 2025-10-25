import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import SkipLink from '../ally/SkipLink.jsx'
import { useAuth } from '../../app/providers/AuthProvider.jsx'

function IconHome(props) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M3 10.5l9-7 9 7"/>
            <path d="M9 21V12h6v9"/>
        </svg>
    )
}

function IconReceipt(props) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M6 2h9a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V4a2 2 0 0 1 2-2z"/>
            <path d="M9 7h6M9 11h6M9 15h4"/>
        </svg>
    )
}

export default function AppShell() {
    const { user, logout } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)
    const buttonRef = useRef(null)
    const navigate = useNavigate()

    // Theme: light/dark persistence and application
    const [darkMode, setDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem('theme')
            if (saved === 'dark') return true
            if (saved === 'light') return false
        } catch {}
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    })
    useEffect(() => {
        const root = document.documentElement
        if (darkMode) root.setAttribute('data-theme', 'dark')
        else root.setAttribute('data-theme', 'light')
        try { localStorage.setItem('theme', darkMode ? 'dark' : 'light') } catch {}
    }, [darkMode])

    const navLinkCls = ({ isActive }) => `flex flex-col items-center rounded-md px-3 py-1.5 text-sm ${isActive ? 'text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)]' : 'text-[rgb(var(--muted-fg))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-hover))]'}`

    useEffect(() => {
        function onDocClick(e) {
            if (!menuOpen) return
            if (menuRef.current && !menuRef.current.contains(e.target) && buttonRef.current && !buttonRef.current.contains(e.target)) {
                setMenuOpen(false)
            }
        }
        function onKey(e) {
            if (e.key === 'Escape') setMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDocClick)
            document.removeEventListener('keydown', onKey)
        }
    }, [menuOpen])

    return (
        <div className="min-h-dvh bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
            <SkipLink />
            <header className="fixed left-1/2 top-0 z-50 w-full max-w-6xl -translate-x-1/2 rounded-b-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 backdrop-blur shadow-sm">
                <div className="container-app grid grid-cols-[1fr_auto_1fr] items-center py-2">
                    {/* Left: Logo */}
                    <div className="flex items-center">
                        <NavLink to="/dashboard" className="inline-flex items-center gap-2" aria-label="Go to dashboard">
                            <img src="/company-logo.svg" alt="Company" className="h-7 w-auto" />
                        </NavLink>
                    </div>

                    {/* Center: Primary nav with icons + labels */}
                    <nav className="flex items-center justify-center gap-10 md:gap-16">
                        <NavLink to="/dashboard" className={navLinkCls}>
                            <IconHome />
                            <span className="text-[11px] leading-4">Home</span>
                        </NavLink>
                        <NavLink to="/purchases" className={navLinkCls}>
                            <IconReceipt />
                            <span className="text-[11px] leading-4">Purchases</span>
                        </NavLink>
                    </nav>

                    {/* Right: Profile menu */}
                    <div className="relative flex items-center justify-end">
                        <button
                            ref={buttonRef}
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-sm font-medium hover:bg-[rgb(var(--surface-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-controls="profile-menu"
                            onClick={() => setMenuOpen(v => !v)}
                            title={user?.name ? `Account: ${user.name}` : 'Account'}
                        >
                            <span aria-hidden="true">
                                {user?.name ? user.name.split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase() : '👤'}
                            </span>
                            <span className="sr-only">Open profile menu</span>
                        </button>
                        {menuOpen && (
                            <div
                                id="profile-menu"
                                role="menu"
                                ref={menuRef}
                                className="absolute right-0 top-full mt-2 z-50 w-44 overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] py-1 shadow"
                            >
                                <button
                                    role="menuitem"
                                    className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-hover))]"
                                    onClick={() => { setMenuOpen(false); navigate('/profile') }}
                                >
                                    Profile
                                </button>
                                <button
                                    role="menuitem"
                                    className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-[rgb(var(--fg))] hover:bg-[rgb(var(--surface-hover))]"
                                    onClick={() => setDarkMode(v => !v)}
                                    aria-pressed={darkMode}
                                >
                                    {darkMode ? 'Dark mode: On' : 'Dark mode: Off'}
                                </button>
                                <div className="my-1 h-px bg-[rgb(var(--border))]" />
                                <button
                                    role="menuitem"
                                    className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.1)]"
                                    onClick={() => { setMenuOpen(false); logout() }}
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <div className="header-spacer" aria-hidden="true" />

            <main id="main-content" className="isolate container-app page-content">
                <Outlet />
            </main>
        </div>
    )
}
