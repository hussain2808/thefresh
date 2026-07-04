import type { AuthProvider } from "@refinedev/core";
import { apiFetch, ApiError } from "@/lib/api-client";
import { clearClientToken, getClientToken, setClientToken } from "@/lib/auth-cookie";

interface LoginResponse {
  accessToken: string;
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setClientToken(res.accessToken);
      return { success: true, redirectTo: "/products" };
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Login failed";
      return {
        success: false,
        error: { name: "LoginError", message },
      };
    }
  },

  logout: async () => {
    clearClientToken();
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const token = getClientToken();
    if (!token) {
      return { authenticated: false, redirectTo: "/login" };
    }
    return { authenticated: true };
  },

  onError: async (error) => {
    if (error?.statusCode === 401) {
      return { logout: true, redirectTo: "/login", error };
    }
    return { error };
  },

  getIdentity: async () => {
    const token = getClientToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return { id: payload.sub, name: payload.email, email: payload.email, role: payload.role };
    } catch {
      return null;
    }
  },
};
