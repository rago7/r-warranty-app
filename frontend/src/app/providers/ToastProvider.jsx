import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

function ToastItem({ t, onClose }) {
    const variant = t.variant || 'info' // 'success' | 'error' | 'info'
    const colors = {
        success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        error: 'border-rose-200 bg-rose-50 text-rose-900',
        info: 'border-slate-200 bg-white text-slate-900',
    }[variant]

    return (
        <div
            role={variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto w-80 overflow-hidden rounded-xl border shadow-sm ${colors}`}
        >
            <div className="p-3">
                {t.title && <div className="font-semibold">{t.title}</div>}
                {t.description && <div className="mt-0.5 text-sm opacity-90">{t.description}</div>}
                <div className="mt-2 flex justify-end">
                    <button onClick={() => onClose(t.id)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50">Dismiss</button>
                </div>
            </div>
        </div>
    )
}

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timers = useRef(new Map())

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        const timer = timers.current.get(id)
        if (timer) clearTimeout(timer)
        timers.current.delete(id)
    }, [])

    const toast = useCallback(({ title, description, variant = 'info', duration = 3500 } = {}) => {
        const id = `t_${++idCounter}`
        const item = { id, title, description, variant }
        setToasts((prev) => [item, ...prev])
        if (duration > 0) {
            const timer = setTimeout(() => dismiss(id), duration)
            timers.current.set(id, timer)
        }
        return id
    }, [dismiss])

    const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Container */}
            <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center sm:inset-auto sm:bottom-4 sm:right-4 sm:top-auto sm:justify-end">
                <div className="flex flex-col gap-2">
                    {toasts.map((t) => (
                        <ToastItem key={t.id} t={t} onClose={dismiss} />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}
