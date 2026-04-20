import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type VerifiedBadgeVariant = "full" | "icon";

interface VerifiedBadgeProps {
  variant?: VerifiedBadgeVariant;
  onPress?: () => void;
}

export function VerifiedBadge({ variant = "icon", onPress }: VerifiedBadgeProps) {
  const content = (
    <>
      <Feather name="shield" size={9} color="#18a06b" />
      {variant === "full" && <Text style={styles.text}>Verificado</Text>}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.badge}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.badge}>{content}</View>;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#18a06b12",
    borderWidth: 1,
    borderColor: "#18a06b30",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  text: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    color: "#18a06b",
  },
});
