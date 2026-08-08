import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      transparent: "#00000000",
      black: "#000000",
      white: "#ffffff",
      "gray-extra-dark": "#222222",
      "gray-dark": "#333333",
      "gray-dark-2": "#3c3c3c",
      "gray-medium-dark": "#444444",
      "gray-medium": "#888888",
      "gray-light": "#cccccc",
      "off-white": "#faf9f6",
      "dol-dark": "#111111", // rgb(17, 17, 17)
      "dol-light": "#f4f4e4", // rgb(244, 244, 228)
      "dol-blue": "#4362f0", // rgb(67, 98, 240)
      "dol-green": "#5daa43", // rgb(93, 170, 67)
      "dol-red": "#ac000f", // rgb(172, 0, 15)
      "dol-yellow": "#ffdb00", // rgb(255, 219, 0)
    },
    extend: {
      animation: {
        "color-cycle": "color-cycle 4s ease-in-out infinite",
      },
      keyframes: {
        "color-cycle": {
          "0%": {
            backgroundColor: "rgba(0, 0, 0, 0)",
            borderColor: "var(--dol-light)",
            color: "var(--dol-light)",
          },
          "10%, 20%": {
            backgroundColor: "rgba(67, 98, 240, 0.5)",
            borderColor: "var(--dol-blue)",
            color: "var(--dol-light)",
          },
          "25%": {
            backgroundColor: "rgba(0, 0, 0, 0)",
            borderColor: "var(--dol-light)",
            color: "var(--dol-light)",
          },
          "35%, 45%": {
            backgroundColor: "rgba(93, 170, 67, 0.66)",
            borderColor: "var(--dol-green)",
            color: "var(--dol-light)",
          },
          "50%": {
            backgroundColor: "rgba(0, 0, 0, 0)",
            borderColor: "var(--dol-light)",
            color: "var(--dol-light)",
          },
          "60%, 70%": {
            backgroundColor: "rgba(172, 0, 15, 0.75)",
            borderColor: "var(--dol-red)",
            color: "var(--dol-light)",
          },
          "75%": {
            backgroundColor: "rgba(0, 0, 0, 0)",
            borderColor: "var(--dol-light)",
            color: "var(--dol-light)",
          },
          "85%, 95%": {
            backgroundColor: "rgba(255, 219, 0, 0.5)",
            borderColor: "var(--dol-yellow)",
            color: "var(--dol-light)",
          },
          "100%": {
            backgroundColor: "rgba(0, 0, 0, 0)",
            borderColor: "var(--dol-light)",
            color: "var(--dol-light)",
          },
        },
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
} satisfies Config;
