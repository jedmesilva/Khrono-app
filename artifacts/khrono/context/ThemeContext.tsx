import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "@khrono_theme";

export type ColorPalette = {
  accent: string;
  accentGreen: string;
  background: string;
  card: string;
  cardBorder: string;
  surface: string;
  surfaceBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  tabIconDefault: string;
  tint: string;
  sheetBg: string;
  sheetBorder: string;
  handleColor: string;
  rowPressed: string;
  divider: string;
  inputBg: string;
  inputBorder: string;
  menuIconBg: string;
  avatarBg: string;
  chevron: string;
};

const ACCENT = "#ff6b35";
const GREEN = "#00e5a0";

export const darkColors: ColorPalette = {
  accent: ACCENT,
  accentGreen: GREEN,
  background: "#0e0e0e",
  card: "#141414",
  cardBorder: "#222222",
  surface: "#1a1a1a",
  surfaceBorder: "#272727",
  text: "#f0f0f0",
  textSecondary: "#909090",
  textMuted: "#555555",
  textDim: "#3d3d3d",
  tabIconDefault: "#505050",
  tint: ACCENT,
  sheetBg: "#121212",
  sheetBorder: "#222222",
  handleColor: "#333333",
  rowPressed: "#1a1a1a",
  divider: "#1e1e1e",
  inputBg: "#131313",
  inputBorder: "#252525",
  menuIconBg: "#1e1e1e",
  avatarBg: "#1e1e1e",
  chevron: "#333333",
};

export const lightColors: ColorPalette = {
  accent: ACCENT,
  accentGreen: GREEN,
  background: "#f5f5f5",
  card: "#ffffff",
  cardBorder: "#e5e5e5",
  surface: "#fafafa",
  surfaceBorder: "#e0e0e0",
  text: "#111111",
  textSecondary: "#666666",
  textMuted: "#aaaaaa",
  textDim: "#cccccc",
  tabIconDefault: "#999999",
  tint: ACCENT,
  sheetBg: "#ffffff",
  sheetBorder: "#e5e5e5",
  handleColor: "#cccccc",
  rowPressed: "#f0f0f0",
  divider: "#eeeeee",
  inputBg: "#f0f0f0",
  inputBorder: "#e0e0e0",
  menuIconBg: "#eeeeee",
  avatarBg: "#e8e8e8",
  chevron: "#cccccc",
};

type ThemeContextValue = {
  isDark: boolean;
  colors: ColorPalette;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: darkColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "light") setIsDark(false);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
