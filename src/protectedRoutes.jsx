import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useEffect } from "react";

export default function ProtectedRoutes({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Check for token in localStorage as an additional security check
    const token = localStorage.getItem("token");

    // Re-check authentication when route changes
    useEffect(() => {
        // If no token and not loading, ensure user is null
        if (!token && !loading) {
            // This will be handled by the redirect below
        }
    }, [location.pathname, token, loading]);

    if (loading) return <div>Loading...</div>;

    // Redirect to login if no user OR no token
    if (!user || !token) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export function GuestRoute({ children }) {
    const { user, loading } = useAuth();
    const token = localStorage.getItem("token");

    if (loading) return <div>Loading...</div>;

    // If user is authenticated, redirect to dashboard
    if (user && token) {
        return <Navigate to="/" replace />;
    }

    // If not authenticated, show the login/signup page
    return children;
}