/**
 * Centralized API client (lib/api.ts).
 *
 * Why exists:
 *   • 26+ ad-hoc fetch() calls across components used different base URLs
 *     (NEXT_PUBLIC_BACKEND_URL vs NEXT_PUBLIC_API_URL), different token
 *     keys (theosphere-token vs theosphere-access-token), and different
 *     error-handling conventions.
 *   • One place to add: Bearer header, JSON parsing, structured errors,
 *     401 → forced logout, 5xx → user-facing toast, request timeouts.
 *
 * Adoption strategy:
 *   New code should call `api.get/post/...`. Existing fetch sites can
 *   migrate incrementally — nothing here breaks the legacy callers.
 */

import { CONFIG } from "./config";

const TOKEN_STORAGE_KEY = "theosphere-access-token";
const DEFAULT_TIMEOUT_MS = 15_000;

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function buildHeaders(init?: HeadersInit, withAuth = true): HeadersInit {
  const headers = new Headers(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (withAuth) {
    const token = readToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return headers;
}

export interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  headers?: HeadersInit;
  body?: unknown;
  timeoutMs?: number;
  withAuth?: boolean;
  /** When true (default), throw ApiError on non-2xx responses. */
  throwOnError?: boolean;
}

export async function request<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const {
    headers,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    withAuth = true,
    throwOnError = true,
    ...rest
  } = opts;

  const url = path.startsWith("http")
    ? path
    : `${CONFIG.API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: buildHeaders(headers, withAuth),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'include',
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") {
      throw new ApiError("Tempo limite excedido", 0);
    }
    throw new ApiError("Erro de rede", 0, err);
  }
  clearTimeout(timer);

  // Force-logout on 401 so the UI can recover (token expired or revoked).
  if (response.status === 401) {
    if (!withAuth) {
      throw new ApiError("Não autorizado", 401);
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        // CONFIG.API_BASE_URL já termina em /api/v1, então só anexamos
        // /auth/refresh — anexar /api/v1/auth/refresh gera path duplicado.
        const refreshUrl = `${CONFIG.API_BASE_URL.replace(/\/$/, "")}/auth/refresh`;
        const refreshRes = await fetch(refreshUrl, {
          method: "POST",
          headers: buildHeaders({}, false),
          credentials: 'include',
        });

        if (refreshRes.ok) {
          const { accessToken } = await refreshRes.json();
          window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
          isRefreshing = false;
          onTokenRefreshed(accessToken);
          
          // Retry original request
          return request<T>(path, opts);
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      } finally {
        isRefreshing = false;
      }

      // If refresh failed or was skipped
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem("theosphere-user-id");
        window.dispatchEvent(new CustomEvent("theosphere:unauthorized"));
      }
      throw new ApiError("Sessão expirada. Por favor, faça login novamente.", 401);
    } else {
      // Outra request já está renovando o token — aguarda e refaz.
      // `_token` recebido aqui é o novo accessToken; não precisamos dele
      // porque request<T> vai relê-lo do localStorage no buildHeaders.
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(() => {
          request<T>(path, opts).then(resolve).catch(reject);
        });
      });
    }
  }

  let parsed: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok && throwOnError) {
    const msg =
      (parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : undefined) ?? `HTTP ${response.status}`;
    throw new ApiError(msg, response.status, parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: Omit<RequestOptions, "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ) => request<T>(path, { ...opts, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ) => request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};
