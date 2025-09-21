import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";


export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || "/dashboard";


    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    async function onSubmit(e) {
        e.preventDefault();
        setError("");
        try {
            setLoading(true);
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="text-xl font-bold">Sign in</h1>
                <p className="mt-1 text-sm text-slate-600">Use any email containing @ and any password (mock).</p>


                <form onSubmit={onSubmit} className="mt-4 grid gap-3">
                    <label className="grid gap-1 text-sm">
                        <span>Email</span>
                        <input
                            type="email"
                            className="rounded-lg border border-slate-300 px-3 py-2"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                    <label className="grid gap-1 text-sm">
                        <span>Password</span>
                        <input
                            type="password"
                            className="rounded-lg border border-slate-300 px-3 py-2"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>


                    {error && <div className="text-sm text-red-600">{error}</div>}


                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-1 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </form>


                <div className="mt-3 text-sm">
                    <span className="text-slate-600">Don’t have an account?</span>{" "}
                    <Link to="/auth/signup" className="text-indigo-700 hover:underline">Create one (coming later)</Link>
                </div>
            </div>
        </div>
    );
}