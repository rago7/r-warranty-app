import { QueryClient, QueryClientProvider } from '@tanstack/react-query'


const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30 * 1000, // 30s
            refetchOnWindowFocus: false,
        },
    },
})


export default function QueryProvider({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}