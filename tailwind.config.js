/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        viggaBg: "#0B1016",
        viggaCard: "#1A1715",
        viggaBrown: "#2A211C",
        viggaGold: "#C5A46D",
        viggaText: "#F5F3EE",
        viggaMuted: "#9CA3AF",
        viggaGreen: "#4ADE80",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
