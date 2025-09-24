import { useEffect, useState } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

export default function TopProgressBar() {
    const fetching = useIsFetching()
    const mutating = useIsMutating()
    const busy = fetching + mutating > 0

    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (busy) setVisible(true)
        else {
            const t = setTimeout(() => setVisible(false), 250)
            return () => clearTimeout(t)
        }
    }, [busy])

    return (
        <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-0.5">
            <div
                className={`h-0.5 origin-left transform bg-indigo-600 transition-[opacity,transform] duration-200 ${visible ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`}
                style={{ width: '100%' }}
            />
        </div>
    )
}
