export default function Input({ label, hint, error, className = '', ...props }) {
    return (
        <label className="grid gap-1 text-sm">
            {label && <span className="font-medium">{label}</span>}
            <input
                {...props}
                className={`w-full rounded-lg border border-[rgb(var(--border))] bg-white px-3 py-2 text-[rgb(var(--fg))] placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] ${className}`}
            />
            {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
            {error && <span className="text-xs text-rose-600">{error}</span>}
        </label>
    )
}