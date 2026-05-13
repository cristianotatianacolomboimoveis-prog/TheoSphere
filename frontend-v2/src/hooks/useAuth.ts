"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Auth hook — talks to the NestJS backend.
 *
 * Token model (after SEC-004 completion on the backend):
 *   • Access token: short-lived JWT (1h default), stored in localStorage so
 *     existing fetch sites keep working. We mark the storage key with the
 *     known surface and remove it eagerly on any logout/expiry path.
 *   • Refresh token: opaque random string, persisted server-side and shipped
 *     to the browser as an httpOnly cookie scoped to /api/v1/auth/refresh.
 *     The browser sends it automatically on refresh; JS never touches it.
 *
 * Refresh flow:
 *   • On hydrate: if the local access token is missing or expired, we call
 *     /auth/refresh — the cookie alone is enough. Success rehydrates the
 *     session silently; failure clears local state.
 *   • A 60-second pre-emptive timer schedules a refresh before the access
 *     token expires, keeping the session warm without 401-driven retries.
 *   • The lib/api client also calls refreshAccessToken() on any 401 it sees.
 *
 * Contract fix (SEC-007): the login endpoint returns
 * `{ accessToken, user }` — NOT wrapped in `{ success, data }`. We branch
 * on `res.ok` and read the typed payload directly.
 */

const TOKEN_KEY = "theosphere-access-token";
const USER_ID_KEY = "theosphere-user-id";
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

// How early (in ms) to refresh the access token before it actually expires.
// 60s margin absorbs clock skew and avoids racing with in-flight requests.
const REFRESH_LEAD_MS = 60_000;

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    plan?: string;
    xp?: number;
  };
}

interface RefreshResponse {
  accessToken: string;
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
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Calls /auth/refresh. The httpOnly refresh cookie travels automatically
 * thanks to credentials: 'include'. Returns the new access token, or null
 * if the refresh failed (e.g. cookie missing/expired/revoked).
 *
 * Exposed at module scope so lib/api.ts can use it for 401 auto-retry
 * without going through the React hook.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RefreshResponse;
    if (!data.accessToken) return null;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_KEY, data.accessToken);
    }
    return data.accessToken;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLocalSession = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_ID_KEY);
    }
    setToken(null);
    setUserId(null);
    setIsAuthenticated(false);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  /**
   * Schedule the next silent refresh based on the token's `exp` claim.
   * Idempotent — clears any previously-scheduled timer first.
   */
  const scheduleRefresh = useCallback(
    (accessToken: string) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      const payload = decodeJwtPayload(accessToken);
      if (!payload?.exp) return;
      const msUntilExpiry = payload.exp * 1000 - Date.now();
      // Fire REFRESH_LEAD_MS before expiry; minimum 5s to avoid tight loops.
      const fireIn = Math.max(5_000, msUntilExpiry - REFRESH_LEAD_MS);
      refreshTimerRef.current = setTimeout(async () => {
        const fresh = await refreshAccessToken();
        if (fresh) {
          setToken(fresh);
          scheduleRefresh(fresh);
        } else {
          clearLocalSession();
        }
      }, fireIn);
    },
    [clearLocalSession],
  );

  const applyAccessToken = useCallback(
    (accessToken: string, uid?: string | null) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_KEY, accessToken);
        if (uid) window.localStorage.setItem(USER_ID_KEY, uid);
      }
      const sub = decodeJwtPayload(accessToken)?.sub ?? null;
      setToken(accessToken);
      setUserId(uid ?? sub);
      setIsAuthenticated(true);
      scheduleRefresh(accessToken);
    },
    [scheduleRefresh],
  );

  // Hydrate on mount.
  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const savedToken = window.localStorage.getItem(TOKEN_KEY);
    const savedUserId = window.localStorage.getItem(USER_ID_KEY);

    const tryHydrate = async () => {
      if (savedToken) {
        const payload = decodeJwtPayload(savedToken);
        if (payload?.exp && payload.exp * 1000 > Date.now()) {
          // Still valid — adopt it and schedule a refresh.
          setToken(savedToken);
          setUserId(savedUserId || payload.sub || null);
          setIsAuthenticated(true);
          scheduleRefresh(savedToken);
          setLoading(false);
          return;
        }
      }
      // Either no token, expired, or malformed — try the refresh cookie.
      const fresh = await refreshAccessToken();
      if (fresh) {
        applyAccessToken(fresh, savedUserId);
      } else {
        clearLocalSession();
      }
      setLoading(false);
    };

    void tryHydrate();

    // Cross-tab logout: another tab cleared the token → mirror here.
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        clearLocalSession();
      }
    };
    window.addEventListener("storage", onStorage);

    // Global unauthorized event — emitted by lib/api when refresh fails.
    const onUnauthorized = () => clearLocalSession();
    window.addEventListener("theosphere:unauthorized", onUnauthorized);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("theosphere:unauthorized", onUnauthorized);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [applyAccessToken, clearLocalSession, scheduleRefresh]);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // accept the refresh cookie
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
      applyAccessToken(data.accessToken, data.user.id);
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
      const _data = (await res.json()) as RegisterResponse;
      return await login(email, password);
    } catch {
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  const logout = useCallback(async () => {
    // Best-effort: tell the backend to clear the refresh cookie.
    // Even if the call fails, we always clear the local session.
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* offline / network error — local state still wiped below */
    }
    clearLocalSession();
  }, [clearLocalSession]);

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
