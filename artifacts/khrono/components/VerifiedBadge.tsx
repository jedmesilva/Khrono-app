import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const GREEN = "#18a06b";

type VerifiedBadgeVariant = "full" | "icon";

interface VerifiedBadgeProps {
  variant?: VerifiedBadgeVariant;
  onPress?: () => void;
}

interface VerifiedIconProps {
  size?: number;
  color?: string;
}

export function VerifiedIcon({ size = 13, color = GREEN }: VerifiedIconProps) {
  return <MaterialCommunityIcons name="check-decagram" size={size} color={color} />;
}

export function VerifiedBadge({ variant = "icon", onPress }: VerifiedBadgeProps) {
  const content = (
    <>
      <VerifiedIcon size={9} color={GREEN} />
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
    backgroundColor: `${GREEN}12`,
    borderWidth: 1,
    borderColor: `${GREEN}30`,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  text: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    color: GREEN,
  },
});
