import axios from "axios";
import { useAuthStore } from "@/store/auth";

export const api = axios.create({
  baseURL: "/api/v1",
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
        const r = await axios.post("/api/v1/auth/refresh/", { refresh: refreshToken });
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
