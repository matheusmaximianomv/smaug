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
        // Identidade por tipo de lançamento (PRD 6.1): cor do ponto/legenda e fundo do selo.
        tipo: {
          avulsa: { DEFAULT: "#3b5bdb", light: "#f0f4ff" },
          parcelada: { DEFAULT: "#c2660a", light: "#fff7ed" },
          recorrente: { DEFAULT: "#6841c7", light: "#f5f0ff" },
          fixa: { DEFAULT: "#2d7a4a", light: "#f0fdf4" },
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
