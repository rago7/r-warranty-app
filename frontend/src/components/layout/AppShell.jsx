import { NavLink, Outlet } from 'react-router-dom'
import SkipLink from '../ally/SkipLink.jsx'
import { useAuth } from '../../app/providers/AuthProvider.jsx'

export default function AppShell() {
    const { user, logout } = useAuth()
    return (
        <div className="min-h-dvh bg-slate-50">
            <SkipLink />
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-6">
                        <NavLink to="/dashboard" className="text-sm font-semibold">
                            Warranty Manager
                        </NavLink>
                        <nav className="flex gap-4">
                            <NavLink
                                to="/dashboard"
                                className={({ isActive }) =>
                                    `text-sm ${isActive ? 'font-semibold text-indigo-700' : 'text-slate-700 hover:text-slate-900'}`
                                }
                            >
                                Dashboard
                            </NavLink>
                            <NavLink
                                to="/receipts"
                                className={({ isActive }) =>
                                    `text-sm ${isActive ? 'font-semibold text-indigo-700' : 'text-slate-700 hover:text-slate-900'}`
                                }
                            >
                                Receipts
                            </NavLink>
                            <NavLink
                                to="/profile"
                                className={({ isActive }) =>
                                    `text-sm ${isActive ? 'font-semibold text-indigo-700' : 'text-slate-700 hover:text-slate-900'}`
                                }
                            >
                                Profile
                            </NavLink>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <span className="hidden text-slate-700 sm:inline">Hi, {user?.name || 'User'}</span>
                        <button
                            type="button"
                            onClick={logout}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            {/* isolate creates a new stacking context so children can sit above other fixed elements if needed */}
            <main id="main-content" className="isolate mx-auto max-w-6xl px-4 py-6">
                <Outlet />
            </main>
        </div>
    )
}
