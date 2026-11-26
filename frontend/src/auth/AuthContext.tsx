import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, refreshSession, setAccessToken, setSessionLostHandler } from "../api/client";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (full_name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>(null!);
type TokenResponse = { access_token: string; user: User };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Sayfa yenilendiğinde bellek temizlenir; oturum HttpOnly refresh cookie ile geri yüklenir.
  useEffect(() => {
    setSessionLostHandler(() => setUser(null));
    refreshSession<TokenResponse>()
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const handle = (d: TokenResponse) => {
    setAccessToken(d.access_token);
    setUser(d.user);
    return d.user;
  };

  const login = useCallback(
    async (identifier: string, password: string) =>
      handle(await api<TokenResponse>("/auth/login", { method: "POST", body: { identifier, password } })),
    [],
  );

  const register = useCallback(
    async (full_name: string, email: string, password: string) =>
      handle(await api<TokenResponse>("/auth/register", { method: "POST", body: { full_name, email, password } })),
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
