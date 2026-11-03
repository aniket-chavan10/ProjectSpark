import defaultTheme from "tailwindcss/defaultTheme";

// Spark "stadium night" palette.
//  - `spark` is the brand: a hot orange that runs into gold (buttons, highlights, the live feel).
//    `emerald` and `brand` are remapped to it, so every older screen that says emerald-600 picks it up.
//  - `ink` is the deep navy-violet of sidebars, consoles and the broadcast.
//  - `volt` is the electric cyan used for information and secondary highlights.
const spark = {
  50: "#fff6ed",
  100: "#ffead4",
  200: "#ffd1a8",
  300: "#ffb070",
  400: "#ff8a3d",
  500: "#ff6a1a",
  600: "#f04e0b",
  700: "#c7390b",
  800: "#9e2f11",
  900: "#7f2a11",
  950: "#451206",
};

const ink = {
  50: "#f3f4fb",
  100: "#e5e7f5",
  200: "#c9cdea",
  300: "#a1a7d4",
  400: "#7279b3",
  500: "#525a99",
  600: "#3c437c",
  700: "#2a3062",
  800: "#1a1f47",
  900: "#11143a",
  950: "#080a22",
};

const volt = {
  50: "#ecfdff",
  100: "#cff8fe",
  200: "#a5f0fc",
  300: "#67e4f9",
  400: "#22cdef",
  500: "#06b0d5",
  600: "#088cb3",
  700: "#0e7091",
  800: "#155b76",
  900: "#164c64",
  950: "#083145",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", ...defaultTheme.fontFamily.sans],
        display: ['"Barlow Condensed"', "Impact", ...defaultTheme.fontFamily.sans],
      },
      colors: { emerald: spark, brand: spark, spark, ink, volt },
      boxShadow: {
        card: "0 1px 2px rgba(17, 20, 58, 0.04), 0 2px 8px -2px rgba(17, 20, 58, 0.06)",
        raised: "0 10px 30px -10px rgba(17, 20, 58, 0.22), 0 2px 6px -2px rgba(17, 20, 58, 0.08)",
        pop: "0 30px 60px -20px rgba(8, 10, 34, 0.55)",
        glow: "0 10px 30px -8px rgba(255, 106, 26, 0.55)",
        "glow-volt": "0 10px 30px -8px rgba(34, 205, 239, 0.5)",
      },
      backgroundImage: {
        "spark-grad": "linear-gradient(120deg, #ff4d0a 0%, #ff7a1a 45%, #ffb21a 100%)",
        "ink-grad": "linear-gradient(135deg, #080a22 0%, #151a52 55%, #26206b 100%)",
        "stadium": "radial-gradient(1200px 500px at 15% -10%, rgba(255,106,26,.22), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(34,205,239,.18), transparent 60%), linear-gradient(180deg, #0b0e2e 0%, #080a22 100%)",
        "grid-faint": "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
        "stripes": "repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 14px)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: 0, transform: "translateY(10px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        "pulse-ring": { "0%": { boxShadow: "0 0 0 0 rgba(239,68,68,.55)" }, "70%": { boxShadow: "0 0 0 8px rgba(239,68,68,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0)" } },
        "stripe-run": { "0%": { backgroundPosition: "0 0" }, "100%": { backgroundPosition: "56px 0" } },
        sweep: { "0%": { transform: "translateX(-120%) skewX(-20deg)" }, "100%": { transform: "translateX(320%) skewX(-20deg)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        "coin-flip": { "0%": { transform: "rotateY(0) translateY(0)" }, "50%": { transform: "rotateY(900deg) translateY(-40px)" }, "100%": { transform: "rotateY(1800deg) translateY(0)" } },
        "pop-in": { "0%": { opacity: 0, transform: "scale(.85)" }, "100%": { opacity: 1, transform: "scale(1)" } },
      },
      animation: {
        "fade-up": "fade-up .4s cubic-bezier(.22,1,.36,1) both",
        "fade-in": "fade-in .3s ease-out both",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        "stripe-run": "stripe-run 1.2s linear infinite",
        sweep: "sweep 3.2s cubic-bezier(.4,0,.2,1) infinite",
        float: "float 4s ease-in-out infinite",
        "coin-flip": "coin-flip 1.1s cubic-bezier(.22,1,.36,1) both",
        "pop-in": "pop-in .35s cubic-bezier(.22,1,.36,1) both",
      },
    },
  },
  plugins: [],
};
