/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Sunlit harbour: friendly navy (also the dark background), warm cream, sea blue, sunny amber.
        ink: { DEFAULT: "#18304a", 800: "#21405f", 700: "#2c5276", 600: "#3a6791" },
        paper: { DEFAULT: "#fff8ec", dim: "#f7ebd5" },
        sea: { DEFAULT: "#167b96", dark: "#0f6179", light: "#7fd0e6" },
        brass: { DEFAULT: "#f2a03d", light: "#ffc873", dark: "#a3560a" },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        reading: ["Nunito", "system-ui", "sans-serif"],
        sans: ["Nunito", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
