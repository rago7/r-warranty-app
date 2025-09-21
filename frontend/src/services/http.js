import axios from "axios";
import { getToken, clearAuth } from "./auth.js";
import { getApiBaseUrl } from "../lib/env.js";


const http = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: false,
    headers: { "Content-Type": "application/json" },
});

// Attach Authorization header if we have a token
http.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


// Global 401 handler: clear auth and kick to /auth/login
http.interceptors.response.use(
    (resp) => resp,
    (error) => {
        const status = error?.response?.status;
        if (status === 401) {
            clearAuth();
            if (!window.location.pathname.startsWith("/auth/login")) {
                window.location.assign("/auth/login");
            }
        }
        return Promise.reject(error);
    }
);


export default http;