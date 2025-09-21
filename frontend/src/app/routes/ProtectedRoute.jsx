import React from "react";


// Step 1: stubbed guard — always allows access.
// Step 2 will add real auth check and redirect to /auth/login
export default function ProtectedRoute({ children }) {
return <>{children}</>;
}