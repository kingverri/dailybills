import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        neutral: {
          50: "rgb(var(--color-neutral-50) / <alpha-value>)",
          100: "rgb(var(--color-neutral-100) / <alpha-value>)",
          200: "rgb(var(--color-neutral-200) / <alpha-value>)",
          300: "rgb(var(--color-neutral-300) / <alpha-value>)",
          400: "rgb(var(--color-neutral-400) / <alpha-value>)",
          500: "rgb(var(--color-neutral-500) / <alpha-value>)",
          600: "rgb(var(--color-neutral-600) / <alpha-value>)",
          700: "rgb(var(--color-neutral-700) / <alpha-value>)",
          800: "rgb(var(--color-neutral-800) / <alpha-value>)",
          900: "rgb(var(--color-neutral-900) / <alpha-value>)"
        },
        brand: {
          50: "rgb(var(--color-brand-50) / <alpha-value>)",
          100: "rgb(var(--color-brand-100) / <alpha-value>)",
          200: "rgb(var(--color-brand-200) / <alpha-value>)",
          500: "rgb(var(--color-brand-500) / <alpha-value>)",
          600: "rgb(var(--color-brand-600) / <alpha-value>)",
          700: "rgb(var(--color-brand-700) / <alpha-value>)",
          800: "rgb(var(--color-brand-800) / <alpha-value>)"
        },
        fuel: {
          100: "rgb(var(--color-fuel-100) / <alpha-value>)",
          500: "rgb(var(--color-fuel-500) / <alpha-value>)",
          700: "rgb(var(--color-fuel-700) / <alpha-value>)"
        },
        cyan: {
          400: "rgb(var(--color-cyan-400) / <alpha-value>)",
          500: "rgb(var(--color-cyan-500) / <alpha-value>)"
        },
        purple: {
          500: "rgb(var(--color-purple-500) / <alpha-value>)"
        },
        amber: {
          50: "rgb(var(--color-amber-50) / <alpha-value>)",
          100: "rgb(var(--color-amber-100) / <alpha-value>)",
          200: "rgb(var(--color-amber-200) / <alpha-value>)",
          800: "rgb(var(--color-amber-800) / <alpha-value>)",
          900: "rgb(var(--color-amber-900) / <alpha-value>)"
        },
        red: {
          50: "rgb(var(--color-red-50) / <alpha-value>)",
          100: "rgb(var(--color-red-100) / <alpha-value>)",
          200: "rgb(var(--color-red-200) / <alpha-value>)",
          500: "rgb(var(--color-red-500) / <alpha-value>)",
          700: "rgb(var(--color-red-700) / <alpha-value>)"
        }
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)"
      }
    }
  },
  plugins: []
};

export default config;
