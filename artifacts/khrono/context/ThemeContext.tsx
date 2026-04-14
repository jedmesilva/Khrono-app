import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "@khrono_theme";

export type ThemePreference = "light" | "dark" | "system";

export type ColorPalette = {
  accent: string;
  accentPressed: string;
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
  iconBack: string;
  // ── button tokens ──────────────────────────────────────
  btnPrimaryBg: string;
  btnPrimaryPressed: string;
  btnPrimaryText: string;
  btnSuccessBg: string;
  btnSuccessPressed: string;
  btnDangerBg: string;
  btnDangerPressed: string;
  btnActionText: string;
  btnDisabledBg: string;
  btnDisabledText: string;
};

const ACCENT        = "#e06030";
const ACCENT_PRESSED = "#C85428";
const GREEN         = "#00e5a0";
const BTN_SUCCESS   = "#18a06b";
const BTN_SUCCESS_P = "#138a5a";
const BTN_DANGER    = "#e05050";
const BTN_DANGER_P  = "#c04040";

export const lightColors: ColorPalette = {
  accent: ACCENT,
  accentPressed: ACCENT_PRESSED,
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
  iconBack: "#2C2A26",
  btnPrimaryBg: "#2C2A26",
  btnPrimaryPressed: "#111010",
  btnPrimaryText: "#F2EFE9",
  btnSuccessBg: BTN_SUCCESS,
  btnSuccessPressed: BTN_SUCCESS_P,
  btnDangerBg: BTN_DANGER,
  btnDangerPressed: BTN_DANGER_P,
  btnActionText: "#ffffff",
  btnDisabledBg: "#E5E1D9",
  btnDisabledText: "#9B9487",
};

export const darkColors: ColorPalette = {
  accent: ACCENT,
  accentPressed: ACCENT_PRESSED,
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
  iconBack: "#f0ebe6",
  btnPrimaryBg: "#F0EBE6",
  btnPrimaryPressed: "#D8D4CF",
  btnPrimaryText: "#1A1714",
  btnSuccessBg: BTN_SUCCESS,
  btnSuccessPressed: BTN_SUCCESS_P,
  btnDangerBg: BTN_DANGER,
  btnDangerPressed: BTN_DANGER_P,
  btnActionText: "#ffffff",
  btnDisabledBg: "#2a2520",
  btnDisabledText: "#504840",
};

type ThemeContextValue = {
  isDark: boolean;
  themePreference: ThemePreference;
  colors: ColorPalette;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  themePreference: "light",
  colors: lightColors,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "dark" || val === "light" || val === "system") {
        setThemePreference(val);
      }
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemePreference) => {
    setThemePreference(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreference((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const isDark = themePreference === "dark";
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, themePreference, colors, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
