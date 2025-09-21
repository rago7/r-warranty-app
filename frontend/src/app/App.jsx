import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import ErrorBoundary from "../components/feedback/ErrorBoundary.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";


// Placeholder pages (Step 1)
import LoginPage from "../features/auth/pages/LoginPage.jsx";
import DashboardPage from "../features/dashboard/pages/DashboardPage.jsx";
import ReceiptsListPage from "../features/receipts/pages/ReceiptsListPage.jsx";
import ProfilePage from "../features/profile/pages/ProfilePage.jsx";
import NotFound from "../components/feedback/NotFound.jsx";


export default function App() {
return (
<ErrorBoundary>
<BrowserRouter>
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
<Route path="profile" element={<ProfilePage />} />
</Route>


{/* 404 */}
<Route path="*" element={<NotFound />} />
</Routes>
</BrowserRouter>
</ErrorBoundary>
);
}