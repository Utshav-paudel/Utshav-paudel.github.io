import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Native UI stack first: SF Pro on iOS/macOS, Segoe UI on Windows,
        // Roboto on Android. Renders sharper at small sizes than Inter and
        // skips the Google Fonts request on mobile.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "system-ui",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
        serif: ["Lora", "Georgia", "serif"],
      },
      colors: {
        ink: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
        accent: {
          light: "#2563eb",
          dark: "#60a5fa",
        },
      },
      typography: {
        DEFAULT: {
          css: { maxWidth: "none" },
        },
      },
    },
  },
  plugins: [typography],
};
