import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

const http = axios.create({
    baseURL,
})

http.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
        }
    } catch {
        // ignore storage access issues
    }
    return config
})

http.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status
        if (status === 401) {
            try {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
            } catch {
                // ignore storage access issues
            }
            const here = `${window.location.pathname}${window.location.search}`
            if (!here.startsWith('/auth/')) {
                window.location.assign(`/auth/login?next=${encodeURIComponent(here)}`)
            }
        }
        return Promise.reject(error)
    },
)

export default http
