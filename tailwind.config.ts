import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#23638c",
          hover: "#1a4b6b",
          soft: "#e8f1f6",
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "Segoe UI", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm:   "8px",
        DEFAULT: "12px",
        lg:   "16px",
        xl:   "20px",
        "2xl":"24px",
      },
      boxShadow: {
        xs:  "0 1px 2px 0 rgba(15,35,55,0.05)",
        sm:  "0 2px 8px 0 rgba(15,35,55,0.06)",
        md:  "0 8px 24px -2px rgba(15,35,55,0.10)",
        lg:  "0 16px 40px -6px rgba(15,35,55,0.14)",
        xl:  "0 24px 56px -8px rgba(15,35,55,0.18)",
        panel: "0 16px 40px -6px rgba(15,35,55,0.14)",
        card:  "0 2px 8px 0 rgba(15,35,55,0.06)",
        "card-hover": "0 8px 24px -2px rgba(15,35,55,0.10)",
      },
      animation: {
        "slide-in-right": "slideInRight 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-up":        "fadeUp 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in":        "fadeIn 200ms ease",
        "scale-in":       "scaleIn 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-dot":      "pulseDot 1.5s ease-in-out infinite",
        "shimmer":        "shimmer 1.5s infinite",
      },
      keyframes: {
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%":      { opacity: "0.5", transform: "scale(0.85)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
      },
      transitionDuration: {
        "250": "250ms",
      },
      spacing: {
        "dvh": "100dvh",
      },
    },
  },
  plugins: [],
};

export default config;