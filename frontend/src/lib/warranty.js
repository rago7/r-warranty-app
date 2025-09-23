export function warrantyInfo(receipt) {
    const end = receipt?.warranty?.end_date ? new Date(receipt.warranty.end_date) : null
    if (!end) return { status: receipt?.status || 'unknown', label: 'No warranty info', daysLeft: null, endDate: null }
    const today = new Date()
    const msLeft = end.getTime() - today.setHours(0,0,0,0)
    const daysLeft = Math.ceil(msLeft / (1000*60*60*24))
    if (daysLeft < 0) {
        return { status: 'expired', label: `Expired on ${end.toLocaleDateString()}`, daysLeft, endDate: end }
    }
    return { status: 'in_warranty', label: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`, daysLeft, endDate: end }
}