import React from "react";
import { NavLink, Outlet } from "react-router-dom";


export default function AppShell() {
return (
<div className="min-h-screen grid grid-cols-[240px_1fr] bg-slate-50">
{/* Sidebar */}
<aside className="bg-white border-r border-slate-200 px-4 py-5">
<div className="text-xl font-extrabold mb-4">Receipts</div>
<nav className="grid gap-2">
<NavItem to="/dashboard">Dashboard</NavItem>
<NavItem to="/receipts">Receipts</NavItem>
<NavItem to="/profile">Profile</NavItem>
</nav>
</aside>


{/* Main area */}
<main className="min-h-screen flex flex-col">
<header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
<div className="font-semibold">Receipt & Warranty Manager</div>
<div className="text-sm text-slate-600">Step 1: Router + Shell</div>
</header>
<section className="p-5">
<Outlet />
</section>
</main>
</div>
);
}


function NavItem({ to, children }) {
return (
<NavLink
to={to}
className={({ isActive }) =>
`px-3 py-2 rounded-lg border text-sm transition ${
isActive
? "bg-indigo-50 text-indigo-700 border-indigo-200"
: "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
}`
}
>
{children}
</NavLink>
);
}