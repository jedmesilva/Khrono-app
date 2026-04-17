import React from "react";
import { View, ViewStyle } from "react-native";

const SIZES = {
  sm: { size: 36, radius: 10 },
  md: { size: 40, radius: 12 },
  lg: { size: 48, radius: 14 },
  xl: { size: 56, radius: 18 },
} as const;

export type IconBoxSize = keyof typeof SIZES;

type Props = {
  size?: IconBoxSize;
  bg: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function IconBox({ size = "md", bg, children, style }: Props) {
  const { size: s, radius } = SIZES[size];
  return (
    <View
      style={[
        {
          width: s,
          height: s,
          borderRadius: radius,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
