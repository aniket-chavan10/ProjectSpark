import defaultTheme from "tailwindcss/defaultTheme";

// One palette for the whole product. `emerald` is remapped to the Spark brand steel blue, so every screen that
// already says emerald-600 picks up the new look at once; `ink` is the dark navy of sidebars and consoles.
const brand = {
  50: "#f4f6fa",
  100: "#e6ecf4",
  200: "#cfd9e8",
  300: "#a9bad3",
  400: "#7f97ba",
  500: "#5a779f",
  600: "#455f86",
  700: "#374c6b",
  800: "#2c3c55",
  900: "#222f43",
  950: "#141c2b",
};

const ink = {
  50: "#f4f6fa",
  100: "#e6eaf2",
  200: "#cdd5e4",
  300: "#a6b3cc",
  400: "#7a8bad",
  500: "#5a6b8f",
  600: "#46547a",
  700: "#2c3857",
  800: "#1a2339",
  900: "#111827",
  950: "#0a0f1c",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        display: ['"Barlow Condensed"', "Impact", ...defaultTheme.fontFamily.sans],
      },
      colors: { emerald: brand, brand, ink },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.05)",
        raised: "0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)",
        pop: "0 18px 40px -12px rgba(15, 23, 42, 0.35)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: 0, transform: "translateY(6px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        "pulse-ring": { "0%": { boxShadow: "0 0 0 0 rgba(239,68,68,.55)" }, "70%": { boxShadow: "0 0 0 8px rgba(239,68,68,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0)" } },
      },
      animation: {
        "fade-up": "fade-up .28s ease-out both",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};
