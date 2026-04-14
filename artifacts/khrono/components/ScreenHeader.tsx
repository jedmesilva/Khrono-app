import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, onBack, right }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        style={[styles.backBtn, { backgroundColor: colors.surface }]}
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
      >
        <Feather name="arrow-left" size={16} color={colors.iconBack} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {right ? (
        <View style={styles.rightSlot}>{right}</View>
      ) : (
        <View style={{ width: 36 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.3,
  },
  rightSlot: {
    flexShrink: 0,
  },
});
