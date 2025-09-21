import React from "react";
import { Link } from "react-router-dom";


export default function LoginPage() {
return (
<div className="grid min-h-screen place-items-center bg-slate-50 p-6">
<div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<h1 className="text-xl font-bold">Sign in</h1>
<p className="mt-1 text-sm text-slate-600">Auth comes in Step 2. This is a placeholder.</p>
<div className="mt-4">
<Link to="/dashboard" className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
Continue to app
</Link>
</div>
</div>
</div>
);
}