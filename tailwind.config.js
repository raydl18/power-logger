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
        sans: [
          "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', '"Roboto"',
          '"Helvetica Neue"', "Arial", "sans-serif",
        ],
        mono: ["var(--font-mono)", '"SF Mono"', "ui-monospace", '"Fira Code"', '"Courier New"', "monospace"],
        display: ["var(--font-display)", '"Barlow Condensed"', "sans-serif"],
      },
      colors: {
        bg: "#111111",
        fg: "#f0f0f0",
        border: "#2d2d2d",
        muted: "#888",
        rpe6: "#4ade80",
        rpe7: "#facc15",
        rpe8: "#fb923c",
        rpe9: "#f87171",
      },
      minHeight: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};
