import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

interface SkillListCardProps {
  name: string;
  description?: string;
  badge?: string;
  isNew?: boolean;
  verifiedBadge?: React.ReactNode;
  onPress?: () => void;
}

export function SkillListCard({
  name,
  description,
  badge,
  isNew = false,
  verifiedBadge,
  onPress,
}: SkillListCardProps) {
  const { colors } = useTheme();
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      {...(onPress ? { onPress } : {})}
    >
      <View style={[styles.iconWrap, { backgroundColor: isNew ? colors.surface : "#ff6b3312", borderColor: isNew ? colors.surfaceBorder : "#ff6b3328" }]}>
        <Feather name="star" size={16} color={isNew ? colors.textMuted : "#ff6b35"} />
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
        <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>{badge}</Text>
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
