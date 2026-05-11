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
        // Newsreader is an editorial screen-serif (variable, optical
        // sizing). Used for the experience/project card body so the
        // long-form bullets read like a magazine column instead of a
        // sans-serif data dump.
        editorial: ["Newsreader", "Lora", "Georgia", "serif"],
        mono: ["Geist Mono", "JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
        serif: ["Newsreader", "Lora", "Georgia", "serif"],
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
        // Warm card backgrounds. parchment.* in light mode (cream/beige),
        // ember.* in dark mode (warm near-black). Used by ExperienceCard
        // and ProjectCard to set the "out box" aesthetic apart from the
        // surrounding white page.
        parchment: {
          50: "#fbf6ea",
          100: "#f7efdc",
          200: "#ede2c4",
          border: "#e8dcc1",
        },
        ember: {
          900: "#1f1c17",
          800: "#26221c",
          700: "#2d2922",
          border: "#3a3528",
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
