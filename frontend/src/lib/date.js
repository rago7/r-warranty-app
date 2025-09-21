export function formatDate(iso, opts = {}) {
    if (!iso) return ''
    const d = new Date(iso)
    const fmt = new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        ...opts,
    })
    return fmt.format(d)
}