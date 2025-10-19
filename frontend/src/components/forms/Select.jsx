export default function Select({ label, options = [], hint, error, className = '', ...props }) {
    return (
        <label className="grid gap-1 text-sm">
            {label && <span className="font-medium">{label}</span>}
            <select
                {...props}
                className={`w-full rounded-lg border border-[rgb(var(--border))] bg-white px-2 py-2 text-[rgb(var(--fg))] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))] ${className}`}
            >
                {options.map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                        {opt.label ?? opt}
                    </option>
                ))}
            </select>
            {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
            {error && <span className="text-xs text-rose-600">{error}</span>}
        </label>
    )
}