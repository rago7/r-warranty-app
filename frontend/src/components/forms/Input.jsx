export default function Input({ label, hint, error, className = '', ...props }) {
    return (
        <label className="grid gap-1 text-sm">
            {label && <span className="font-medium">{label}</span>}
            <input {...props} className={`rounded-lg border border-slate-300 px-3 py-2 ${className}`} />
            {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
            {error && <span className="text-xs text-rose-600">{error}</span>}
        </label>
    )
}