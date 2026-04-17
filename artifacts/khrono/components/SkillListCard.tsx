import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { GlobalStyles, cardColors } from "@/constants/globalStyles";
import { IconBox } from "@/components/IconBox";

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
      style={[GlobalStyles.cardRow, cardColors(colors)]}
      {...(onPress ? { onPress } : {})}
    >
      <IconBox size="sm" bg={isNew ? colors.surface : "#e0603012"}>
        <Feather name="star" size={16} color={isNew ? colors.textMuted : "#e06030"} />
      </IconBox>
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  name: { fontFamily: "Sora_700Bold", fontSize: 15, flexShrink: 1 },
  description: { fontFamily: "Sora_400Regular", fontSize: 11, lineHeight: 16 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeText: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase" },
});
