import { Link, useNavigate } from 'react-router-dom'
import useTitle from '../../../lib/useTitle'
import ReceiptForm from '../components/ReceiptForm'

export default function ReceiptCreatePage() {
    useTitle('Add receipt')
    const navigate = useNavigate()

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to="/receipts" className="text-sm text-indigo-600 hover:underline">
                    ← Back to receipts
                </Link>
                <h1 className="text-xl font-semibold">Add receipt</h1>
            </div>
            <ReceiptForm mode="create" onSubmitSuccess={(id) => navigate(`/receipts/${id}`)} />
        </div>
    )
}
