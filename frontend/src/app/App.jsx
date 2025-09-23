import React from "react";
import ReceiptDetailPage from "../features/receipts/pages/ReceiptDetailPage.jsx";
import ReceiptFormPage from "../features/receipts/pages/ReceiptFormPage.jsx"; // NEW
import ProfilePage from "../features/profile/pages/ProfilePage.jsx";
import NotFound from "../components/feedback/NotFound.jsx";
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import ErrorBoundary from "../components/feedback/ErrorBoundary.jsx";
import QueryProvider from "./providers/QueryProvider.js";
import {AuthProvider} from "./providers/AuthProvider.js";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AppShell from "../components/layout/AppShell.jsx";
import DashboardPage from "../features/dashboard/pages/DashboardPage.jsx";
import ReceiptsListPage from "../features/receipts/pages/ReceiptsListPage.jsx";
import LoginPage from "../features/auth/pages/LoginPage.jsx";


export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <QueryProvider>
                    <AuthProvider>
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
                                <Route path="receipts/new" element={<ReceiptFormPage mode="create" />} /> {/* NEW */}
                                <Route path="receipts/:id" element={<ReceiptDetailPage />} />
                                <Route path="receipts/:id/edit" element={<ReceiptFormPage mode="edit" />} /> {/* NEW */}
                                <Route path="profile" element={<ProfilePage />} />
                            </Route>


                            {/* 404 */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </AuthProvider>
                </QueryProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}