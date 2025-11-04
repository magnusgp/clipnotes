/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Space Grotesk", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        surface: {
          canvas: "var(--surface-canvas)",
          glass: "var(--surface-glass)",
          "glass-strong": "var(--surface-glass-strong)",
          panel: "var(--surface-panel)",
        },
        border: {
          glass: "var(--border-glass)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          accent: "var(--text-accent)",
        },
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          glow: "var(--accent-glow)",
        },
      },
      boxShadow: {
        glass: "var(--shadow-glass)",
      },
      borderRadius: {
        glass: "var(--card-border-radius)",
      },
    },
  },
  plugins: [],
};
