import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

interface ToolListCardProps {
  name: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  description?: string;
  badge?: string;
  available?: boolean;
  verifiedBadge?: React.ReactNode;
  onPress?: () => void;
}

export function ToolListCard({
  name,
  iconName,
  description,
  badge,
  available = true,
  verifiedBadge,
  onPress,
}: ToolListCardProps) {
  const { colors } = useTheme();
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: available ? 1 : 0.55 }]}
      {...(onPress ? { onPress } : {})}
    >
      <View style={[styles.iconWrap, { backgroundColor: available ? "#ff6b3312" : colors.surface, borderColor: available ? "#ff6b3528" : colors.surfaceBorder }]}>
        <Feather name={iconName} size={16} color={available ? "#ff6b35" : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          {verifiedBadge}
        </View>
        {description ? (
          <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: available ? "#ff6b3512" : colors.surface, borderColor: available ? "#ff6b3530" : colors.surfaceBorder }]}>
          <Text style={[styles.badgeText, { color: available ? "#ff6b35" : colors.textMuted }]}>{badge}</Text>
        </View>
      ) : null}
      {onPress ? (
        <Feather name="chevron-right" size={14} color={colors.chevron} />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, padding: 16 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  name: { fontFamily: "Sora_700Bold", fontSize: 15, flex: 1 },
  description: { fontFamily: "Sora_400Regular", fontSize: 11, lineHeight: 16 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeText: { fontFamily: "DMMono_400Regular", fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase" },
});
