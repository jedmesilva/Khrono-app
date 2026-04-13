import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

export type StatItem = {
  label: string;
  value: string | number;
  color?: string;
  align?: "flex-start" | "center" | "flex-end";
};

type Props = {
  items: StatItem[];
  style?: object;
};

export function StatsBar({ items, style }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card },
        style,
      ]}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <View style={[styles.item, { alignItems: item.align ?? "flex-start" }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.value, { color: colors.text }, item.color ? { color: item.color } : undefined]}>
              {item.value}
            </Text>
          </View>
          {index < items.length - 1 && (
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  item: {
    flex: 1,
  },
  label: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    fontFamily: "DMSans_500Medium",
    fontSize: 17,
  },
  divider: {
    width: 1,
    height: 30,
    marginHorizontal: 10,
  },
});
