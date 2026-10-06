import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",

    background: {
      default: "#0f1115",
      paper: "#181b21",
    },

    primary: {
      main: "#7c4dff",
    },

    secondary: {
      main: "#00bcd4",
    },

    text: {
      primary: "#ffffff",
      secondary: "#a0a4ad",
    },
  },

  typography: {
    fontFamily: "Inter, Roboto, Arial, sans-serif",

    h1: {
      fontweight: 700,
    },

    h2: {
      fontweight: 700,
    },

    h3: {
      fontweight: 700,
    },

    button: {
      textTransform: "none",
      fontweight: 600,
    },
  },

  shape: {
    borderRadius: 10,
  },
});
