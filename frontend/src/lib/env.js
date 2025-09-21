export const env = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "/api",
    USE_MOCKS: String(import.meta.env.VITE_USE_MOCKS) === "true",
    MODE: import.meta.env.MODE, // 'development' | 'production' | 'test'
};


export function getApiBaseUrl() {
    let url = env.API_BASE_URL || "/api";
// strip trailing slash for consistency
    if (url.endsWith("/")) url = url.slice(0, -1);
    return url;
}


// Optional: sanity check at startup (call it in main if you want)
export function assertRequiredEnv() {
    if (!env.API_BASE_URL) {
// Non-fatal in dev because we default to "/api"
        console.warn("VITE_API_BASE_URL is not set. Falling back to '/api'.");
    }
}