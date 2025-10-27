import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import ErrorBoundary from "../components/feedback/ErrorBoundary.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import { AuthProvider } from "./providers/AuthProvider.jsx";
import QueryProvider from "./providers/QueryProvider.jsx";
import PrefsProvider from "./providers/PrefsProvider.jsx";
import ToastProvider from "./providers/ToastProvider.jsx";
import TopProgressBar from "../components/feedback/TopProgressBar.jsx";
import ScrollToTop from "./ScrollToTop.jsx";

// Lazy pages
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage.jsx"))
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage.jsx"))
const ReceiptsListPage = lazy(() => import("../features/receipts/pages/ReceiptsListPage.jsx"))
const ReceiptDetailPage = lazy(() => import("../features/receipts/pages/ReceiptDetailPage.jsx"))
const ReceiptCreatePage = lazy(() => import("../features/receipts/pages/ReceiptCreatePage.jsx"))
const ReceiptEditPage = lazy(() => import("../features/receipts/pages/ReceiptEditPage.jsx"))
const ProfilePage = lazy(() => import("../features/profile/pages/ProfilePage.jsx"))
const NotFound = lazy(() => import("../components/feedback/NotFound.jsx"))

// Purchases pages (new)

function RouteFallback() {
    return (
        <div className="p-4">
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-40 animate-pulse rounded bg-slate-200" />
        </div>
    )
}

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <ScrollToTop />
                <QueryProvider>
                    <TopProgressBar />
                    <AuthProvider>
                        <PrefsProvider>
                            <ToastProvider>
                                <Suspense fallback={<RouteFallback />}>
                                    <Routes>
                                        {/* Public route(s) */}
                                        <Route path="/auth/login" element={<LoginPage />} />

                                        {/* Protected nested routes under the App Shell */}
                                        <Route
                                            path="/"
                                            element={
                                                <ProtectedRoute>
                                                    <AppShell />
                                                </ProtectedRoute>
                                            }
                                        >
                                            <Route index element={<Navigate to="/dashboard" replace />} />
                                            <Route path="dashboard" element={<DashboardPage />} />

                                            {/*/!* Purchases (new) *!/*/}
                                            {/*<Route path="purchases" element={<PurchasesListPage />} />*/}
                                            {/*<Route path="purchases/new" element={<PurchaseFormPage mode="create" />} />*/}
                                            {/*<Route path="purchases/:id" element={<PurchaseDetailPage />} />*/}
                                            {/*<Route path="purchases/:id/edit" element={<PurchaseFormPage mode="edit" />} />*/}

                                            {/* Receipts */}
                                            <Route path="receipts" element={<ReceiptsListPage />} />
                                            <Route path="receipts/new" element={<ReceiptCreatePage />} />
                                            <Route path="receipts/:id" element={<ReceiptDetailPage />} />
                                            <Route path="receipts/:id/edit" element={<ReceiptEditPage />} />

                                            <Route path="profile" element={<ProfilePage />} />
                                        </Route>

                                        {/* 404 */}
                                        <Route path="*" element={<NotFound />} />
                                    </Routes>
                                </Suspense>
                            </ToastProvider>
                        </PrefsProvider>
                    </AuthProvider>
                </QueryProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
