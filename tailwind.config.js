/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 24px 80px rgba(149, 18, 53, 0.28)",
        panel: "0 25px 60px rgba(0, 0, 0, 0.35)",
      },
      colors: {
        accent: {
          50: "#fff3f5",
          100: "#ffe4ea",
          200: "#ffcbd8",
          300: "#ff9eb6",
          400: "#fb688f",
          500: "#f23d6f",
          600: "#e31f5c",
          700: "#be1149",
          800: "#951235",
          900: "#7d1532",
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 6s ease-in-out infinite",
        float: "float 12s ease-in-out infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "0.9" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -14px, 0)" },
        },
      },
    },
  },
  plugins: [],
};
