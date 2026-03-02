// src/providers/ThemeProvider.tsx
import { ThemeProvider as ReStyleProvider } from "@shopify/restyle";
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createAppTheme, DarkPalette, LightPalette } from "../theme";

type Mode = "light" | "dark";

type ThemeModeContextValue = {
  mode: Mode;
  toggle: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
  undefined,
);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<Mode>("light");

  const theme =
    mode === "light"
      ? createAppTheme(LightPalette)
      : createAppTheme(DarkPalette);

  const toggle = () => setMode((m) => (m === "light" ? "dark" : "light"));

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ReStyleProvider theme={theme}>{children}</ReStyleProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
};
