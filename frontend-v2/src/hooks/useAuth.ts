"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Auth hook — talks to the NestJS backend.
 *
 * Contract fix (SEC-007): the backend's AuthService.login returns
 * `{ accessToken, user: { id, email, plan, xp } }` — NOT wrapped in
 * `{ success, data }`. The previous implementation gated on `data.success`
 * which was always undefined, so every successful login was reported as
 * a failure. We now branch on `res.ok` and read the typed payload directly.
 *
 * Token storage caveat (SEC-004, deferred): the access token still lives in
 * localStorage, which is exposed to any XSS. Mitigations applied here while
 * the full refresh-token / httpOnly-cookie migration is queued:
 *   • Token lifetime trimmed to 1h on the backend (see auth.module.ts).
 *   • Clean expiry check on hydrate.
 * The proper fix is a server-issued refresh_token in an httpOnly cookie +
 * short-lived in-memory access token. Tracked in the post-audit roadmap.
 */

const TOKEN_KEY = "theosphere-access-token";
const USER_ID_KEY = "theosphere-user-id";
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    plan?: string;
    xp?: number;
  };
}

interface RegisterResponse {
  message: string;
  userId: string;
}

interface ErrorResponse {
  message?: string;
  error?: string;
}

function decodeJwtPayload(
  token: string,
): { sub?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64 (browser atob doesn't handle url-safe chars)
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_ID_KEY);
    }
    setToken(null);
    setUserId(null);
    setIsAuthenticated(false);
  }, []);

  // Hydrate from localStorage on mount. Suppressed hydration mismatch is
  // handled by the parent layout (suppressHydrationWarning on <html>).
  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    const savedToken = window.localStorage.getItem(TOKEN_KEY);
    const savedUserId = window.localStorage.getItem(USER_ID_KEY);

    if (savedToken) {
      const payload = decodeJwtPayload(savedToken);
      if (payload?.exp && payload.exp * 1000 > Date.now()) {
        setToken(savedToken);
        setUserId(savedUserId || payload.sub || null);
        setIsAuthenticated(true);
      } else {
        // Expired or malformed — purge silently.
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as ErrorResponse;
        return {
          success: false,
          error: err.message || err.error || "Credenciais inválidas",
        };
      }

      const data = (await res.json()) as LoginResponse;
      if (!data.accessToken || !data.user?.id) {
        return { success: false, error: "Resposta inválida do servidor" };
      }

      window.localStorage.setItem(TOKEN_KEY, data.accessToken);
      window.localStorage.setItem(USER_ID_KEY, data.user.id);
      setToken(data.accessToken);
      setUserId(data.user.id);
      setIsAuthenticated(true);
      return { success: true };
    } catch {
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  const register = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as ErrorResponse;
        return {
          success: false,
          error: err.message || err.error || "Falha no cadastro",
        };
      }

      // Backend returns { message, userId } on success.
      const _data = (await res.json()) as RegisterResponse;
      // Auto-login post-registration.
      return await login(email, password);
    } catch {
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  return {
    isAuthenticated,
    userId,
    token,
    loading,
    login,
    register,
    logout,
  };
}
