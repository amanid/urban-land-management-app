import axios from "axios";
import { useAuthStore } from "@/store/auth";

// URL de base de l'API — agnostique :
//  - Tout-en-un (frontend servi par Django) : "/api/v1" sur le meme domaine
//  - Dev avec proxy Vite : "/api/v1" route vers le backend local
//  - Frontend separe : VITE_API_BASE=https://api.exemple.com
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "") + "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pending: ((t: string) => void)[] = [];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve) => {
          pending.push((t) => {
            original.headers.Authorization = `Bearer ${t}`;
            resolve(api(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const r = await axios.post(`${API_BASE}/auth/refresh/`, { refresh: refreshToken });
        setTokens(r.data.access, r.data.refresh || refreshToken);
        pending.forEach((cb) => cb(r.data.access));
        pending = [];
        original.headers.Authorization = `Bearer ${r.data.access}`;
        return api(original);
      } catch (e) {
        logout();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
