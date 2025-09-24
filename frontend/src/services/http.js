import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const http = axios.create({ baseURL })

// Attach token if present
http.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
        }
    } catch {}
    return config
})

// Global 401 handler: clear creds and bounce to login
http.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status
        if (status === 401) {
            try {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
            } catch {}
            const here = window.location.pathname + window.location.search
            if (!here.startsWith('/auth/')) {
                window.location.assign(`/auth/login?next=${encodeURIComponent(here)}`)
            }
        }
        return Promise.reject(error)
    }
)

export default http