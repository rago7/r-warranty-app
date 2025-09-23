export function formatMoney(amount, currency = 'USD', locale) {
    if (amount == null) return ''
    try {
        return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency }).format(amount)
    } catch {
        return `$${Number(amount).toFixed(2)}`
    }
}