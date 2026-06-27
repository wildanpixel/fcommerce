import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#090b10",
          900: "#11151d",
          850: "#161b25",
          800: "#1e2531",
          700: "#2c3545",
          500: "#657187",
          300: "#b5bfcd",
          100: "#eef3f9"
        },
        signal: {
          blue: "#62a8ff",
          green: "#4ade80",
          rose: "#fb7185",
          amber: "#fbbf24",
          violet: "#a78bfa"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 18px 80px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
} satisfies Config;
