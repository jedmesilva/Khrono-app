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
  primaryBtn: {
    backgroundColor: "#e06030",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
  },
  authTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    letterSpacing: -0.8,
  },
  formLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
});

export function cardColors(colors: ColorPalette) {
  return {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
  } as const;
}
