import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { GlobalStyles } from "@/constants/globalStyles";
import { useTheme } from "@/context/ThemeContext";

export type AppButtonVariant = "primary" | "green" | "red" | "ghost";

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
    variant === "green" ? colors.btnSuccessBg :
    variant === "red"   ? colors.btnDangerBg  :
    variant === "ghost" ? "transparent"       :
                          colors.btnPrimaryBg;

  const bgPressed =
    variant === "green" ? colors.btnSuccessPressed :
    variant === "red"   ? colors.btnDangerPressed  :
    variant === "ghost" ? "transparent"            :
                          colors.btnPrimaryPressed;

  const textColor =
    variant === "ghost"   ? colors.textMuted     :
    variant === "primary" ? colors.btnPrimaryText :
                            colors.btnActionText;

  const resolvedColor = disabled ? colors.btnDisabledText : textColor;

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
          borderColor: variant === "ghost" ? colors.inputBorder : "transparent",
          borderWidth: variant === "ghost" ? 1 : 0,
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
