// theme.ts
import { createTheme } from "@shopify/restyle";

export const LightPalette = {
  primary: "#f0eeee",
  primaryDark: "#efefef",
  accent: "#d54e36",
  gray100: "#f4f4f4",
  gray200: "#d3d3d3",
  gray400: "#9a9b9b",
  gray800: "#5a5a5a",
  white: "#F3F4F6",
  black: "#000000",
  text: "#424141",
  textSecondary: "#838383",
  background: "#e2e2e2",
};
export const DarkPalette = {
  primary: "#414446",
  primaryDark: "#2f3340",
  accent: "#d54e36",
  gray100: "#0a0a0a",
  gray200: "#dbdddb",
  gray400: "#9a9b9b",
  gray800: "#5a5a5a",
  white: "#F3F4F6",
  black: "#000000",
  text: "#eaeaea",
  textSecondary: "#b1a7a7",
  background: "#22252b",
};

export const categoriesColor = {
  slimiba: "#FF3B30",
  atvalinajums: "#63d138",
  maaciibas: "rgb(36, 167, 80)",
  iislaiciigs: "#5AC8FA",
  cits: "#AF52DE",
  komandejums: "#FF9500",
};

export const createAppTheme = (palette: typeof LightPalette) =>
  createTheme({
    colors: {
      ...palette,
      background: palette.background,
      text: palette.text,
    },

    spacing: {
      xs: 4,
      s: 8,
      m: 12,
      l: 24,
      xl: 32,
    },

    borderRadii: {
      s: 4,
      m: 8,
      l: 16,
      full: 999,
    },

    textVariants: {
      defaults: {
        color: "text",
        fontSize: 16,
        fontFamily: "Inter-Regular",
      },
      header: {
        // color: "text",
        fontSize: 28,
        fontFamily: "Inter-Regular",
      },
      subtitle: {
        fontSize: 16,
        color: "theme.colors.textSecondary",
      },
      body: {
        fontSize: 16,
        fontFamily: "Inter-Regular",
      },
      small: {
        fontSize: 12,
        fontFamily: "Inter-Regular",
      },
    },

    buttonVariants: {
      primary: {
        backgroundColor: "accent",
        padding: "m",
        borderRadius: "m",
      },
      secondary: {
        backgroundColor: "gray100",
        padding: "m",
        borderRadius: "m",
        borderWidth: 1,
        borderColor: "primary",
      },
      accent: {
        backgroundColor: "accent",
        padding: "m",
        borderRadius: "m",
        borderWidth: 1,
        borderColor: "primary",
      },
    },

    breakpoints: {
      phone: 0,
      tablet: 768,
    },
  });

export type Theme = ReturnType<typeof createAppTheme>;
