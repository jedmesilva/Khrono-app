import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

import { useTheme } from "@/context/ThemeContext";

type Props = {
  onPress?: () => void;
};

export function BackButton({ onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress ?? (() => router.back())} hitSlop={12}>
      <Feather name="arrow-left" size={20} color={colors.iconBack} />
    </Pressable>
  );
}
