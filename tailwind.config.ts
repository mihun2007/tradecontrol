import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        surface: "rgb(var(--surface) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        profit: "#17a269",
        loss: "#e35050"
      },
      boxShadow: {
        premium: "0 24px 70px -34px rgb(0 0 0 / 0.38)",
        soft: "0 18px 50px -36px rgb(15 23 42 / 0.55)"
      }
    }
  },
  plugins: []
};

export default config;
