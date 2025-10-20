import { Link } from 'react-router-dom'
import { formatDate } from '../../../lib/date'
import { usePrefs } from '../../../app/providers/PrefsProvider.jsx'
import { useState, useEffect, useCallback } from 'react'

export default function UpcomingExpiriesWidget({ items, bare = false }) {
    const { prefs } = usePrefs()
    const [index, setIndex] = useState(0)

    const safeItems = items || []
    const count = safeItems.length

    useEffect(() => {
        // clamp index if items change
        if (index >= count && count > 0) setIndex(0)
    }, [count, index])

    const prev = useCallback(() => {
        if (count <= 1) return
        setIndex((i) => (i - 1 + count) % count)
    }, [count])

    const next = useCallback(() => {
        if (count <= 1) return
        setIndex((i) => (i + 1) % count)
    }, [count])

    useEffect(() => {
        function onKey(e) {
            if (count <= 1) return
            if (e.key === 'ArrowLeft') prev()
            if (e.key === 'ArrowRight') next()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [count, prev, next])

    const content = (
        <>
            <h3 className="card-title">Upcoming expiries (60 days)</h3>
            {count === 0 ? (
                <p className="text-sm text-[rgb(var(--muted-fg))]">Nothing expiring soon.</p>
            ) : (
                <div className="relative">
                    {/* Carousel viewport */}
                    <div className="flex items-stretch gap-3 mt-2">
                        <div className="flex-1 p-3">
                            {/* make this wrapper relative so arrows align with the card content */}
                            <div className="relative">
                                <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                    {/* Current item */}
                                    {safeItems[index] && (
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0">
                                                <Link to={`/receipts/${safeItems[index].id}`} className="truncate font-medium hover:underline">
                                                    {safeItems[index].title || safeItems[index].product_name}
                                                </Link>
                                                <div className="truncate text-[rgb(var(--muted-fg))] text-sm">
                                                    {safeItems[index].merchant} • {formatDate(safeItems[index].purchase_date, { timeZone: prefs.timezone, locale: prefs.locale })}
                                                </div>
                                            </div>
                                            <div className="ml-3 shrink-0 rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-xs text-[rgb(var(--muted-fg))]">
                                                {safeItems[index].days_left}d left
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Prev / Next controls moved inside this relative wrapper so they center on the item line */}
                                {count > 1 && (
                                    <>
                                        <button
                                            aria-label="Previous"
                                            onClick={prev}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 rounded-full bg-white/80 p-1 shadow hover:bg-white"
                                            style={{ transformOrigin: 'center', marginLeft: '-10px' }}
                                        >
                                            ‹
                                        </button>

                                        <button
                                            aria-label="Next"
                                            onClick={next}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 rounded-full bg-white/80 p-1 shadow hover:bg-white"
                                            style={{ transformOrigin: 'center', marginRight: '-10px' }}
                                        >
                                            ›
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Count / total below the carousel */}
                    {count > 1 && (
                        <div className="mt-2 flex items-center justify-center">
                            <div className="rounded-full bg-[rgb(var(--card))] px-3 py-1 text-sm text-[rgb(var(--muted-fg))] border border-[rgb(var(--border))]">
                                {index + 1}/{count}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )

    if (bare) return content

    return (
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
            {content}
        </div>
    )
}
