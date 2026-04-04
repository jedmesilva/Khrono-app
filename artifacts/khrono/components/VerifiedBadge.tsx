import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type VerifiedBadgeVariant = "full" | "icon";

interface VerifiedBadgeProps {
  variant?: VerifiedBadgeVariant;
  onPress?: () => void;
}

export function VerifiedBadge({ variant = "full", onPress }: VerifiedBadgeProps) {
  const content = (
    <>
      <Feather name="check-circle" size={9} color="#00e5a0" />
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
    backgroundColor: "#00e5a012",
    borderWidth: 1,
    borderColor: "#00e5a030",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  text: {
    fontFamily: "DMMono_500Medium",
    fontSize: 9,
    color: "#00e5a0",
  },
});
