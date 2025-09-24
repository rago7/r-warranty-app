import { createPortal } from 'react-dom'
import { useEffect } from 'react'

function useLockBodyScroll(active) {
    useEffect(() => {
        if (!active) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [active])
}

export default function ConfirmDialog({
                                          open,
                                          title,
                                          description,
                                          confirmText = 'Confirm',
                                          cancelText = 'Cancel',
                                          onConfirm,
                                          onCancel,
                                          loading = false,
                                      }) {
    // Keep hooks unconditional
    useLockBodyScroll(open)

    return createPortal(
        // Use `hidden` class instead of early return to satisfy hooks/lint
        <div className={open ? '' : 'hidden'}>
            {/* Fullscreen overlay with extreme z-index */}
            <div className="fixed inset-0 z-[2147483647]">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/40"
                    onClick={onCancel}
                    aria-hidden="true"
                />
                {/* Absolutely centered dialog (viewport-based) */}
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-title"
                    className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-lg outline-none"
                >
                    <div className="border-b border-slate-200 p-4">
                        <h3 id="confirm-title" className="text-base font-semibold">
                            {title}
                        </h3>
                    </div>

                    <div className="max-h-[70vh] overflow-auto p-4 text-sm text-slate-700">
                        {description}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-200 p-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className="rounded-lg border border-rose-200 bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                            {loading ? 'Deleting…' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
