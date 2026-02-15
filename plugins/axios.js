import axios from "axios";

// Use VITE_API_URL for local dev (e.g. http://localhost:3000); production build uses .env or fallback
const baseURL =
  import.meta.env.VITE_API_URL || "https://api.aashish.maaniish.com.np";

const api = axios.create({
  baseURL,
  withCredentials: true,
});
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

// Request interceptor to add token from localStorage to Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh if:
    // 1. The request was to refresh-token itself (avoid infinite loop)
    // 2. The request was to logout (should not refresh on logout)
    // 3. The request was already retried
    // 4. We're on login/signup pages
    const isRefreshTokenRequest =
      originalRequest.url?.includes("/refresh-token");
    const isLogoutRequest = originalRequest.url?.includes("/logout");
    const path = window.location.pathname.toLowerCase();
    const isPublicRoute =
      path.startsWith("/login") || path.startsWith("/signup");

    // If access token expired and we should try to refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshTokenRequest &&
      !isLogoutRequest &&
      !isPublicRoute
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // wait until refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      isRefreshing = true;

      try {
        // 🔄 call refresh-token
        const refreshResponse = await api.post("/api/auth/refresh-token");

        // Update token in localStorage if returned in response
        if (refreshResponse.data?.token) {
          localStorage.setItem("token", refreshResponse.data.token);
        }

        processQueue(null);
        return api(originalRequest); // retry original request
      } catch (refreshError) {
        processQueue(refreshError);

        // logout if refresh fails - but don't redirect if already on login
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        // Only redirect if not already on login/signup page
        if (!isPublicRoute) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
