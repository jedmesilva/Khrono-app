import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

import { useTheme } from "@/context/ThemeContext";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

type Props = {
  icon?: FeatherIconName;
  size?: number;
  onPress?: () => void;
};

export function BackButton({ icon = "arrow-left", size = 20, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress ?? (() => router.back())} hitSlop={12}>
      <Feather name={icon} size={size} color={colors.iconBack} />
    </Pressable>
  );
}
