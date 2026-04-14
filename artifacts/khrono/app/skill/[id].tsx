import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useTheme } from "@/context/ThemeContext";

export default function SkillDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScreenHeader title="Skill" />
      <Text style={[styles.title, { color: colors.text }]}>Skill {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: "Sora_600SemiBold", fontSize: 20, padding: 20 },
});
