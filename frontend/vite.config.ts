import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Base relative pour que les assets fonctionnent que ce soit servi a la
  // racine du domaine OU depuis un sous-chemin. Critique pour le mode
  // tout-en-un (frontend servi par Django).
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": process.env.VITE_API_PROXY || "http://localhost:8010",
      "/media": process.env.VITE_API_PROXY || "http://localhost:8010",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
