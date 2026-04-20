import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import type { ViewStyle } from "react-native";

import { useTheme } from "@/context/ThemeContext";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

type Props = {
  icon: FeatherIconName;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  backgroundColor?: string;
  hitSlop?: number;
  style?: ViewStyle;
};

export function IconButton({
  icon,
  onPress,
  size = 36,
  iconSize = 16,
  color,
  backgroundColor,
  hitSlop = 8,
  style,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      style={[
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? colors.surface,
        },
        style,
      ]}
    >
      <Feather name={icon} size={iconSize} color={color ?? colors.iconBack} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
