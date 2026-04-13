import { StyleSheet } from "react-native";
import type { ColorPalette } from "@/context/ThemeContext";

export const GlobalStyles = StyleSheet.create({
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },
});

export function cardColors(colors: ColorPalette) {
  return {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
  } as const;
}
