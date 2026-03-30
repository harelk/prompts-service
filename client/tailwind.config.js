/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F52E8",
          hover: "#3F42CC",
          pressed: "#3235A8",
        },
        background: {
          app: "#F7F7F8",
          surface: "#FFFFFF",
        },
        text: {
          primary: "#1A1A22",
          secondary: "#4A4A54",
          tertiary: "#6E6E78",
        },
        status: {
          "draft-bg": "#EFEFEF",
          "draft-text": "#4A4A54",
          "active-bg": "#EEF0FF",
          "active-text": "#3235A8",
          "in_progress-bg": "#FFF0E6",
          "in_progress-text": "#C05600",
          "done-bg": "#EAFAF2",
          "done-text": "#148048",
          "archived-bg": "#FFF8E6",
          "archived-text": "#A07000",
        },
        owner: {
          "raout-bg": "#FDE8F0",
          "raout-text": "#9B1B5A",
          "harel-bg": "#E8F4FD",
          "harel-text": "#1B5E9B",
          "dvora-bg": "#F0FDE8",
          "dvora-text": "#3D7A1B",
          "claude-bg": "#F3E8FD",
          "claude-text": "#6B1B9B",
        },
        error: "#E03040",
        success: "#1FAD64",
      },
      fontFamily: {
        rubik: ["Rubik", "sans-serif"],
      },
      fontSize: {
        xs: "12px",
        sm: "14px",
        md: "16px",
        lg: "18px",
        xl: "20px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        full: "9999px",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};
