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

export const lightColors: ColorPalette = {
  accent: ACCENT,
  accentGreen: GREEN,
  background: "#F8F5F2",
  card: "#ffffff",
  cardBorder: "#edeae6",
  surface: "#f2f0ed",
  surfaceBorder: "#e8e4df",
  text: "#1a1a1a",
  textSecondary: "#444444",
  textMuted: "#888888",
  textDim: "#aaaaaa",
  tabIconDefault: "#aaaaaa",
  tint: ACCENT,
  sheetBg: "#ffffff",
  sheetBorder: "#f2f0ee",
  handleColor: "#d8d4cf",
  rowPressed: "#f2f0ed",
  divider: "#f2f0ee",
  inputBg: "#f2f0ed",
  inputBorder: "#e8e4df",
  menuIconBg: "#f2f0ed",
  avatarBg: "#ede9e4",
  chevron: "#d0ccc8",
};

export const darkColors: ColorPalette = {
  accent: ACCENT,
  accentGreen: GREEN,
  background: "#100e0c",
  card: "#1a1714",
  cardBorder: "#2a2520",
  surface: "#211e1a",
  surfaceBorder: "#302b26",
  text: "#f0ebe6",
  textSecondary: "#a09890",
  textMuted: "#706860",
  textDim: "#504840",
  tabIconDefault: "#706860",
  tint: ACCENT,
  sheetBg: "#1a1714",
  sheetBorder: "#2a2520",
  handleColor: "#3a3530",
  rowPressed: "#211e1a",
  divider: "#231f1c",
  inputBg: "#161310",
  inputBorder: "#302b26",
  menuIconBg: "#211e1a",
  avatarBg: "#251f1a",
  chevron: "#3a3530",
};

type ThemeContextValue = {
  isDark: boolean;
  colors: ColorPalette;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "dark") setIsDark(true);
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
