import { Link, useNavigate, useParams } from 'react-router-dom'
import useTitle from '../../../lib/useTitle'
import Skeleton from '../../../components/feedback/Skeleton'
import ReceiptForm from '../components/ReceiptForm'
import { useReceipt } from '../hooks/useReceipts'

export default function ReceiptEditPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { data, isLoading, isError, error } = useReceipt(id)
    const merchantName = data?.merchant?.name
    useTitle(merchantName ? `Edit ${merchantName} receipt` : 'Edit receipt')

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-96" />
            </div>
        )
    }

    if (isError || !data) {
        const message = error?.response?.status === 404 ? 'Receipt not found' : error?.message || 'Failed to load receipt'
        return (
            <div className="space-y-4">
                <Link to="/receipts" className="text-sm text-indigo-600 hover:underline">
                    ← Back to receipts
                </Link>
                <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{message}</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to={`/receipts/${id}`} className="text-sm text-indigo-600 hover:underline">
                    ← Back to receipt detail
                </Link>
                <h1 className="text-xl font-semibold">Edit receipt</h1>
            </div>
            <ReceiptForm
                mode="edit"
                receiptId={id}
                initialDetail={data.raw}
                onSubmitSuccess={(receiptId) => navigate(`/receipts/${receiptId}`)}
            />
        </div>
    )
}
