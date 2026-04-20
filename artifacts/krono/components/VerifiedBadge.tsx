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
  if (variant === "icon") {
    if (onPress) {
      return (
        <Pressable onPress={onPress}>
          <VerifiedIcon size={18} color={GREEN} />
        </Pressable>
      );
    }
    return <VerifiedIcon size={18} color={GREEN} />;
  }

  const content = (
    <View style={styles.fullRow}>
      <VerifiedIcon size={14} color={GREEN} />
      <Text style={styles.text}>Verificado</Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

const styles = StyleSheet.create({
  fullRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: GREEN,
  },
});
