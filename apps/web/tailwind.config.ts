import type { Config } from "tailwindcss";

// BRIGHT management-game theme. Token names are kept stable so existing
// components flip to the light palette automatically.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#EAF3FF",        // page background (pale sky blue)
        elevated: "#FFFFFF",    // panels
        surface: "#F3F8FE",     // secondary surface
        surfaceAlt: "#E7F0FB",  // tertiary / chips
        card: "#FFFFFF",        // cards
        line: "#D7E2F1",        // soft blue-gray border
        neon: "#2F66B3",        // primary blue
        cyan: "#1594B0",
        purple: "#7A5AD1",
        pink: "#DB4E9E",
        lime: "#2E9E63",
        amber: "#C77E1E",
        orange: "#DB6A2E",
        ink: "#18335A",         // primary navy text
        muted: "#4E6A93",
        faint: "#8DA0C0",
        window: "#FFCF7A",      // warm window light (used inside floor art)
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-pixel)", "ui-monospace", "monospace"],
        pixel: ["var(--font-pixel)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 6px 20px rgba(24,51,90,0.10)",
        neon: "0 6px 18px rgba(47,102,179,0.20)",
        window: "0 0 10px rgba(255,207,122,0.5)",
      },
      borderRadius: { xl2: "1.25rem" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
        bob: { "0%,100%": { transform: "translateY(0) rotate(0deg)" }, "50%": { transform: "translateY(-2px) rotate(-2deg)" } },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
        flicker: { "0%,100%": { opacity: "1" }, "45%": { opacity: "0.85" }, "50%": { opacity: "0.7" }, "55%": { opacity: "0.9" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
        twinkle: { "0%,100%": { opacity: "0.5" }, "50%": { opacity: "1" } },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        bob: "bob 1s ease-in-out infinite",
        pulseSoft: "pulseSoft 1.6s ease-in-out infinite",
        flicker: "flicker 4s ease-in-out infinite",
        blink: "blink 1.4s steps(1) infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
