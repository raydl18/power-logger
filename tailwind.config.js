/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Courier New"', "Courier", "monospace"],
      },
      colors: {
        bg: "#0a0a0a",
        fg: "#fafafa",
        border: "#2a2a2a",
        muted: "#666",
        rpe6: "#4ade80",
        rpe7: "#facc15",
        rpe8: "#fb923c",
        rpe9: "#f87171",
      },
      minHeight: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};
