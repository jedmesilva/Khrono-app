import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, type ViewStyle } from "react-native";

import { useTheme } from "@/context/ThemeContext";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

type Props = {
  icon: FeatherIconName;
  onPress: () => void;
  size?: number;
  color?: string;
  hitSlop?: number;
  style?: ViewStyle;
};

export function SimpleIconButton({
  icon,
  onPress,
  size = 20,
  color,
  hitSlop = 12,
  style,
}: Props) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={hitSlop} style={style}>
      <Feather name={icon} size={size} color={color ?? colors.iconBack} />
    </Pressable>
  );
}
