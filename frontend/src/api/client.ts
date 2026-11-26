// API istemcisi. Access token yalnızca bellekte tutulur (localStorage KULLANILMAZ).
// 401 alındığında HttpOnly refresh cookie ile bir kez sessizce yenileme denenir.

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: { field: string; message: string }[] = []) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<unknown | null> | null = null;
let onSessionLost: () => void = () => {};

export const setAccessToken = (t: string | null) => (accessToken = t);
export const setSessionLostHandler = (fn: () => void) => (onSessionLost = fn);

function csrfToken(): string {
  return document.cookie.split("; ").find((c) => c.startsWith("csrf_token="))?.split("=")[1] ?? "";
}

/** Refresh cookie ile yeni access token alır. Eşzamanlı çağrılar tek isteği paylaşır. */
export function refreshSession<T = unknown>(): Promise<T | null> {
  refreshing ??= doRefresh().finally(() => (refreshing = null));
  return refreshing as Promise<T | null>;
}

async function doRefresh(): Promise<unknown | null> {
  if (!csrfToken()) return null; // oturum çerezi yoksa yenileme denenmez
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRF-Token": csrfToken() },
  });
  if (!res.ok) {
    accessToken = null;
    return null;
  }
  const data = await res.json();
  accessToken = data.access_token;
  return data;
}

const tryRefresh = async () => (await refreshSession()) !== null;

type Options = {
  method?: string;
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | null | undefined>;
  raw?: boolean;
};

export async function api<T = unknown>(path: string, opts: Options = {}, retry = true): Promise<T> {
  const params = new URLSearchParams();
  Object.entries(opts.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const url = `/api${path}${params.size ? `?${params}` : ""}`;
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (path.startsWith("/auth/logout")) headers["X-CSRF-Token"] = csrfToken();

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      credentials: "same-origin",
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError(0, "Sunucuya ulaşılamıyor. İnternet bağlantınızı veya sunucuyu kontrol edin.");
  }

  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await tryRefresh()) return api<T>(path, opts, false);
    onSessionLost();
  }
  if (!res.ok) {
    let msg = "İşlem gerçekleştirilemedi.";
    let errors = [];
    try {
      const data = await res.json();
      msg = typeof data.detail === "string" ? data.detail : msg;
      errors = data.errors ?? [];
    } catch {
      /* JSON olmayan hata */
    }
    throw new ApiError(res.status, msg, errors);
  }
  if (opts.raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Korumalı dosyayı token ile indirip yeni sekmede açar. */
export async function openProtectedFile(path: string) {
  const res = await api<Response>(path, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
