import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

interface SecondaryAction {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
}

interface CadastroDoneProps {
  topPadding: number;
  title: string;
  subtitle: React.ReactNode;
  onVerPerfil: () => void;
  secondaryAction?: SecondaryAction;
}

export function CadastroDone({
  topPadding,
  title,
  subtitle,
  onVerPerfil,
  secondaryAction,
}: CadastroDoneProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <View style={styles.doneWrap}>
        <View style={styles.doneIcon}>
          <Feather name="check" size={32} color="#ff6b35" />
        </View>
        <Text style={[styles.doneTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.doneSub, { color: colors.textSecondary }]}>{subtitle}</Text>

        {secondaryAction && (
          <Pressable style={styles.secondaryBtn} onPress={secondaryAction.onPress}>
            <Feather name={secondaryAction.icon} size={14} color="#ff6b35" />
            <Text style={styles.secondaryBtnText}>{secondaryAction.label}</Text>
          </Pressable>
        )}

        <Pressable style={styles.primaryBtn} onPress={onVerPerfil}>
          <Text style={styles.primaryBtnText}>Ver perfil</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#ff6b3515", borderWidth: 1, borderColor: "#ff6b3530", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  doneTitle: { fontFamily: "Sora_700Bold", fontSize: 22, textAlign: "center" },
  doneSub: { fontFamily: "Sora_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 12 },
  primaryBtn: { backgroundColor: "#ff6b35", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: "center", justifyContent: "center", width: "100%" },
  primaryBtnText: { fontFamily: "Sora_700Bold", fontSize: 14, color: "#fff" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ff6b3512", borderWidth: 1, borderColor: "#ff6b3530", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: "100%", justifyContent: "center" },
  secondaryBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 14, color: "#ff6b35" },
});
