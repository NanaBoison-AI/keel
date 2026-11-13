/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0e1b2c", 800: "#14263b", 700: "#1d3550", 600: "#2b4868" },
        paper: { DEFAULT: "#f6f1e7", dim: "#ebe4d4" },
        brass: { DEFAULT: "#b8893a", light: "#d4a85a", dark: "#7f5c1a" },
      },
      fontFamily: {
        serif: ["Literata", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
