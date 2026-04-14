import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { GlobalStyles } from "@/constants/globalStyles";
import { useTheme } from "@/context/ThemeContext";

export type AppButtonVariant = "primary" | "accent" | "green" | "red" | "ghost" | "ghost-red";

const DANGER_COLOR = "#e05050";
const DANGER_PRESSED = "#c04040";

type Props = {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Feather>["name"];
  variant?: AppButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppButton({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
  style,
}: Props) {
  const { colors } = useTheme();

  const bg =
    variant === "accent"    ? colors.accent        :
    variant === "green"     ? colors.btnSuccessBg  :
    variant === "red"       ? colors.btnDangerBg   :
    variant === "ghost-red" ? "transparent"        :
    variant === "ghost"     ? "transparent"        :
                              colors.btnPrimaryBg;

  const bgPressed =
    variant === "accent"    ? colors.accentPressed      :
    variant === "green"     ? colors.btnSuccessPressed  :
    variant === "red"       ? colors.btnDangerPressed   :
    variant === "ghost-red" ? DANGER_COLOR + "12"       :
    variant === "ghost"     ? "transparent"             :
                              colors.btnPrimaryPressed;

  const textColor =
    variant === "ghost-red" ? DANGER_COLOR           :
    variant === "ghost"     ? colors.textMuted        :
    variant === "primary"   ? colors.btnPrimaryText   :
                              colors.btnActionText;

  const resolvedColor = disabled ? colors.btnDisabledText : textColor;

  const borderColor =
    variant === "ghost-red" ? DANGER_COLOR + "60" :
    variant === "ghost"     ? colors.inputBorder   :
                              "transparent";

  const borderWidth =
    variant === "ghost-red" || variant === "ghost" ? 1 : 0;

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        GlobalStyles.primaryBtn,
        {
          backgroundColor: disabled ? colors.btnDisabledBg : pressed ? bgPressed : bg,
          borderColor,
          borderWidth,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={15} color={resolvedColor} />}
      <Text style={[s.label, { color: resolvedColor }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  label: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
