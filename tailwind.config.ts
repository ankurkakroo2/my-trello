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
        background: "var(--background)",
        foreground: "var(--foreground)",
        brutal: {
          black: "#000000",
          white: "#ffffff",
          yellow: "#FFDE59",
          blue: "#4D96FF",
          pink: "#FF6B9D",
          green: "#6BCB77",
          orange: "#FF9F45",
          purple: "#9B59B6",
        },
      },
      boxShadow: {
        "brutal": "4px 4px 0px 0px #000000",
        "brutal-sm": "2px 2px 0px 0px #000000",
        "brutal-lg": "6px 6px 0px 0px #000000",
      },
      borderWidth: {
        "brutal": "3px",
      },
    },
  },
  plugins: [],
};

export default config;
