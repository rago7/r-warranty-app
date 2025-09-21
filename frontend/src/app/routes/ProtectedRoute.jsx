import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";


export default function ProtectedRoute({ children }) {
    const { isAuthed } = useAuth();
    const location = useLocation();
    if (!isAuthed) {
        return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
    }
    return <>{children}</>;
}