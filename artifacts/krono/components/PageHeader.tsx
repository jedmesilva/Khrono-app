import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

type Props = {
  title: string;
  right?: React.ReactNode;
  style?: object;
};

export function PageHeader({ title, right, style }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]}>
      <Text
        style={[styles.title, { color: colors.text }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right != null && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontFamily: "Sora_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
  },
  right: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
