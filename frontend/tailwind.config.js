/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        accent: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        ink: {
          950: "#0b1020",
          900: "#101a33",
          800: "#1a2547",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 10px 40px -10px rgba(59, 130, 246, 0.45)",
        soft: "0 4px 16px rgba(15, 23, 42, 0.06)",
        card: "0 1px 0 rgba(255,255,255,0.5) inset, 0 8px 24px -8px rgba(15,23,42,0.12)",
      },
      backgroundImage: {
        "grad-brand": "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
        "grad-soft": "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)",
        "grad-dark": "linear-gradient(135deg, #0b1020 0%, #1e1b4b 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 280ms ease-out both",
        shimmer: "shimmer 1.2s linear infinite",
      },
    },
  },
  plugins: [],
};
