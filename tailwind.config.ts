import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Black to grey scale theme
        black: "#000000",
        gray: {
          50: "#fafafa",
          100: "#f5f5f5",
          150: "#e5e5e5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          750: "#333333",
          800: "#262626",
          850: "#1a1a1a",
          900: "#171717",
          950: "#0a0a0a",
        },
      },
      boxShadow: {
        "subtle": "0 1px 3px rgba(0, 0, 0, 0.5)",
        "medium": "0 4px 6px rgba(0, 0, 0, 0.5)",
        "large": "0 10px 15px rgba(0, 0, 0, 0.5)",
        "glow": "0 0 20px rgba(255, 255, 255, 0.08)",
        "glow-lg": "0 0 40px rgba(255, 255, 255, 0.12)",
        "card-hover": "0 8px 16px rgba(0, 0, 0, 0.4)",
      },
      borderRadius: {
        "xl": "12px",
        "2xl": "16px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Segoe UI\"",
          "Roboto",
          "\"Helvetica Neue\"",
          "Arial",
          "sans-serif",
        ],
      },
      animation: {
        "slide-up": "slideUp 0.25s ease-out",
        "slide-down": "slideDown 0.2s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
