import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

/**
 * Wraps login/signup pages. Redirects to dashboard if user is already logged in.
 */
export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  const token = localStorage.getItem("token");

  if (loading) return <div>Loading...</div>;

  if (user && token) {
    return <Navigate to="/" replace />;
  }

  return children;
}
