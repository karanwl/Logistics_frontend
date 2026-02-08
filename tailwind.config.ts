import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b1220",
          800: "#111a2b",
          700: "#1b2740",
          600: "#253354",
          500: "#2f3f68"
        },
        steel: {
          50: "#f6f8fb",
          100: "#e8edf5",
          200: "#cbd6e4",
          300: "#a8b8cf",
          400: "#7f94b2",
          500: "#5f7596",
          600: "#495b78",
          700: "#3a4962",
          800: "#2c384c",
          900: "#1d2636"
        },
        accent: {
          500: "#3b82f6",
          600: "#2563eb"
        }
      },
      boxShadow: {
        card: "0 18px 50px rgba(15, 23, 42, 0.12)",
        soft: "0 8px 24px rgba(15, 23, 42, 0.08)"
      },
      borderRadius: {
        xl: "1rem"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
