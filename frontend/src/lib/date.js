export function formatDate(iso, opts = {}) {
    if (!iso) return ''
    const d = new Date(iso)
    const fmt = new Intl.DateTimeFormat(opts.locale || undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        timeZone: opts.timeZone,
        ...opts,
    })
    return fmt.format(d)
}

export function formatTime(iso, opts = {}) {
    if (!iso) return ''
    const d = new Date(iso)
    const fmt = new Intl.DateTimeFormat(opts.locale || undefined, {
        hour: '2-digit', minute: '2-digit',
        timeZone: opts.timeZone,
        hour12: opts.hour12,
        ...opts,
    })
    return fmt.format(d)
}