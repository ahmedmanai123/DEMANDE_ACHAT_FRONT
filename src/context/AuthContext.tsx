// ============================================================
// context/AuthContext.tsx
// ============================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────

export type Permission = {
  autorisation: string;
  acces: string;
};

export type TypeCompte = "Administrateur" | "Standard" | "Acheteur";

export interface AuthUser {
  id: string;
  userName: string;
  email?: string;
  typeCompte: TypeCompte;
  permissions: Permission[];
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

// ── Context ──────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

// ── JWT decoder (sans lib externe) ──────────────────────────

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return (payload.exp as number) * 1000 < Date.now();
}

function buildUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwt(token);
  if (!payload) return null;

  // Adapter les clés selon ce que votre backend ASP.NET met dans le JWT
  // Exemple avec les claims standards + custom
  const rawPermissions = (payload["permissions"] as string[] | undefined) ?? [];

  const permissions: Permission[] = rawPermissions.map((p) => {
    const [autorisation, acces] = p.split(":");
    return { autorisation, acces };
  });

  return {
    id: (payload["sub"] ?? payload["nameid"] ?? "") as string,
    userName: (payload["unique_name"] ?? payload["name"] ?? "") as string,
    email: payload["email"] as string | undefined,
    typeCompte: (payload["typeCompte"] ?? "Standard") as TypeCompte,
    permissions,
    token,
  };
}

// ── Provider ─────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate depuis localStorage au démarrage
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !isTokenExpired(token)) {
      setUser(buildUserFromToken(token));
    } else {
      localStorage.removeItem("token");
    }
    setLoading(false);
  }, []);

  const login = async (token: string) => {
    localStorage.setItem("token", token);
    setUser(buildUserFromToken(token));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};