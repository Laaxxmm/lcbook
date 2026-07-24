import type { Config } from "tailwindcss";

// Design tokens lifted from live learncrew.org CSS (spec §16).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lc: {
          "green-900": "#0A2C22",
          "green-800": "#0E3B2E",
          "green-700": "#16543F",
          "green-400": "#4A554E",
          gold: "#E8A33D",
          "on-gold": "#3A2A08",
          cream: "#FAF7F2",
          border: "#E6E0D5",
        },
      },
      fontFamily: {
        sans: ["var(--lc-font)", "system-ui", "-apple-system", "sans-serif"],
      },
      maxWidth: {
        container: "1140px",
      },
    },
  },
  plugins: [],
};

export default config;
