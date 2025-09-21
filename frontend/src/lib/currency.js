export function formatMoney(amount, currency = 'USD') {
    if (amount == null) return ''
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
    } catch {
        return `$${Number(amount).toFixed(2)}`
    }
}