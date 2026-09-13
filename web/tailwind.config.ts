import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: "#c0292a",
          light: "#fdf1f1",
          mid: "#e8a0a0",
        },
        bg: "#faf9f8",
        surface: "#ffffff",
        border: "#e8e5e2",
        text: {
          DEFAULT: "#1a1614",
          muted: "#6b6460",
          subtle: "#a09c98",
        },
        green: {
          DEFAULT: "#1a7a4a",
          light: "#f0faf5",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
      width: {
        nav: "236px",
      },
    },
  },
  plugins: [],
} satisfies Config;
