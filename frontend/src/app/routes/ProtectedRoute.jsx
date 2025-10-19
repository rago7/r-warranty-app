import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider.jsx'

export default function ProtectedRoute({ children }) {
    const { user, isLoading } = useAuth()
    const location = useLocation()

    if (isLoading) {
        return (
            <div className="grid min-h-dvh place-items-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[rgb(var(--border))] border-t-[rgb(var(--ring))]" aria-label="Loading" />
            </div>
        )
    }

    if (user) return children

    const next = location.pathname + location.search
    const nextSafe = next.startsWith('/auth/') ? '/dashboard' : next

    return <Navigate to={`/auth/login?next=${encodeURIComponent(nextSafe)}`} replace />
}