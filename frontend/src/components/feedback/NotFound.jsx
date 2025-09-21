import React from "react";
import { Link } from "react-router-dom";


export default function NotFound() {
return (
<div className="max-w-xl">
<h1 className="text-2xl font-bold mb-2">404 – Page not found</h1>
<p className="text-slate-600 mb-4">
The page you’re looking for doesn’t exist. Try going back to the dashboard.
</p>
<Link to="/dashboard" className="inline-block px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
Go to Dashboard
</Link>
</div>
);
}