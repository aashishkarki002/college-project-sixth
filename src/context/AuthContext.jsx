import { createContext, useContext, useState, useEffect } from "react";
import api from "../../plugins/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchMe = async (force = false) => {
    // Skip fetch if on login or signup page to prevent loops (unless forced)
    if (!force) {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith("/login") || path.startsWith("/signup")) {
        setLoading(false);
        setUser(null);
        return;
      }
    }

    try {
      const response = await api.get("/api/auth/get-me");
      if (response.data.success && response.data.admin) {
        setUser(response.data.admin);
      } else {
        setUser(null);
      }
    } catch (error) {
      // Only log non-401 errors (401 is expected when not logged in)
      if (error.response?.status !== 401) {
        console.error("Error fetching user:", error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchMe();
  }, []);
  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Clear loading state to ensure ProtectedRoutes re-evaluates
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
