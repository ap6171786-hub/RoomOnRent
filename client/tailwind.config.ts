import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        brand: "var(--brand)",
        "brand-strong": "var(--brand-strong)",
        "brand-soft": "var(--brand-soft)",
        success: "var(--success)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        popover: "var(--shadow-popover)",
      },
      borderRadius: {
        card: "1.25rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
