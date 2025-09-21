
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import http from "../../services/http.js";
import { getToken, getUser, setAuth, clearAuth } from "../../services/auth.js";


const AuthContext = createContext(null);


export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getUser());
    const [token, setToken] = useState(() => getToken());


// Hydrate user from /api/auth/me if token exists but user not stored
    useEffect(() => {
        // @ts-ignore
        const hydrate = async () => {
            if (token && !user) {
                try {
                    const { data } = await http.get("/auth/me");
                    if (data?.user) {
                        setAuth({ token, user: data.user });
                        setUser(data.user);
                    }
                } catch (_) {
// 401 handled globally in http interceptor
                }
            }
        };
        hydrate();
    }, [token, user]);


    const login = useCallback(async (email, password) => {
        const { data } = await http.post("/auth/login", { email, password });
        setAuth({ token: data.access, user: data.user });
        setToken(data.access);
        setUser(data.user);
    }, []);


    const logout = useCallback(() => {
        clearAuth();
        setUser(null);
        setToken(null);
// The UI will redirect on next protected access; optional push here
        if (!window.location.pathname.startsWith("/auth/login")) {
            window.location.assign("/auth/login");
        }
    }, []);


    const value = useMemo(() => ({ user, token, isAuthed: Boolean(token), login, logout }), [user, token, login, logout]);


    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}