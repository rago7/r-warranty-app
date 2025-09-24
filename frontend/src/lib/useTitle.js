import { useEffect } from 'react'

export default function useTitle(title) {
    useEffect(() => {
        const prev = document.title
        document.title = title ? `${title} • Warranty Manager` : 'Warranty Manager'
        return () => { document.title = prev }
    }, [title])
}
