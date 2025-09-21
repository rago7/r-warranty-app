// @ts-ignore
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getToken, getUser, setAuth, clearAuth } from "../../services/auth.js";


const AuthContext = createContext(null);


export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getUser());
    const [token, setToken] = useState(() => getToken());


// Hydrate user from /api/auth/me if we only have a token
    useEffect(() => {
        // @ts-ignore
        const hydrate = async () => {
            if (token && !user) {
                try {
                    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
                    if (res.ok) {
                        const data = await res.json();
                        setAuth({ token, user: data.user });
                        setUser(data.user);
                    }
                } catch (e) {
// ignore for mocks
                }
            }
        };
        hydrate();
    }, [token, user]);

    // @ts-ignore
    const login = useCallback(async (email, password) => {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Login failed");
        }
        const data = await res.json();
        setAuth({ token: data.access, user: data.user });
        setToken(data.access);
        setUser(data.user);
    }, []);


    const logout = useCallback(() => {
        clearAuth();
        setUser(null);
        setToken(null);
    }, []);


    const value = useMemo(() => ({ user, token, isAuthed: Boolean(token), login, logout }), [user, token, login, logout]);


    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}