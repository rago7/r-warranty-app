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