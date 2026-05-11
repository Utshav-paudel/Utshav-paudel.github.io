import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Geist (Vercel's house sans) for body. Modern, sharp at all sizes,
        // designed for technical interfaces. System fonts as fallback during
        // the brief moment before Geist loads.
        sans: [
          "Geist",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        // Instrument Serif for editorial accents (hero name, large headings).
        // Italic at display sizes gives the page real personality without
        // making the technical content feel out of place.
        display: ["Instrument Serif", "Lora", "Georgia", "serif"],
        mono: ["Geist Mono", "JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
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
