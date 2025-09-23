import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import ErrorBoundary from "../components/feedback/ErrorBoundary.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import { AuthProvider } from "./providers/AuthProvider.jsx";
import QueryProvider from "./providers/QueryProvider.jsx";
import PrefsProvider from "./providers/PrefsProvider.jsx"; // NEW

// Pages
import LoginPage from "../features/auth/pages/LoginPage.jsx";
import DashboardPage from "../features/dashboard/pages/DashboardPage.jsx";
import ReceiptsListPage from "../features/receipts/pages/ReceiptsListPage.jsx";
import ReceiptDetailPage from "../features/receipts/pages/ReceiptDetailPage.jsx";
import ReceiptFormPage from "../features/receipts/pages/ReceiptFormPage.jsx";
import ProfilePage from "../features/profile/pages/ProfilePage.jsx"; // UPDATED
import NotFound from "../components/feedback/NotFound.jsx";

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <QueryProvider>
                    <AuthProvider>
                        <PrefsProvider>{/* needs auth to fetch /profile */}
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
                                    <Route path="receipts" element={<ReceiptsListPage />} />
                                    <Route path="receipts/new" element={<ReceiptFormPage mode="create" />} />
                                    <Route path="receipts/:id" element={<ReceiptDetailPage />} />
                                    <Route path="receipts/:id/edit" element={<ReceiptFormPage mode="edit" />} />
                                    <Route path="profile" element={<ProfilePage />} />
                                </Route>

                                {/* 404 */}
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </PrefsProvider>
                    </AuthProvider>
                </QueryProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
