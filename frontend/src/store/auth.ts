import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "super_admin" | "admin" | "sales_agent" | "cashier" | "viewer";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: Role;
  role_label: string;
  avatar?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthUser, access: string, refresh: string) => void;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, accessToken: null, refreshToken: null,
      setSession: (user, access, refresh) =>
        set({ user, accessToken: access, refreshToken: refresh }),
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "urban-land-auth" },
  ),
);

export const isAdminLevel = (role?: Role | null) =>
  role === "super_admin" || role === "admin";
export const isSuperAdmin = (role?: Role | null) => role === "super_admin";
export const canRecordPayments = (role?: Role | null) =>
  role === "super_admin" || role === "admin" || role === "cashier";
export const canManageSales = (role?: Role | null) =>
  role === "super_admin" || role === "admin" || role === "sales_agent";
