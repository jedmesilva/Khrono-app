import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={[styles.container, style]}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <View style={[styles.item, { alignItems: item.align ?? "flex-start" }]}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={[styles.value, item.color ? { color: item.color } : undefined]}>
              {item.value}
            </Text>
          </View>
          {index < items.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  item: {
    flex: 1,
  },
  label: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#555",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    fontFamily: "DMMono_500Medium",
    fontSize: 17,
    color: "#fff",
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "#1a1a1a",
    marginHorizontal: 10,
  },
});
