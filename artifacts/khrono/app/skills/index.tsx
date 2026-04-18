import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SkillListCard } from "@/components/SkillListCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { BackButton } from "@/components/BackButton";
import { useCatalog } from "@/context/CatalogContext";
import { useTheme } from "@/context/ThemeContext";
import { useUserCatalog } from "@/context/UserCatalogContext";
import { formatMonthYear } from "@/context/ServicesContext";
import { Skill, VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";
import { useState } from "react";

export default function SkillsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { userSkills } = useUserCatalog();
  const { skills: catalogSkills } = useCatalog();
  const [dialog, setDialog] = useState<{ title: string; message?: string; buttons?: AppDialogButton[] } | null>(null);

  const skills: Skill[] = useMemo(
    () =>
      userSkills.map((entry) => ({
        id: entry.skill_id,
        name: entry.skill?.nome ?? "",
        type: entry.skill?.category ?? "",
        description: entry.skill?.description ?? "",
        verified: entry.skill?.verified ? ({ type: "documentation" as VerificationType }) : null,
        isNew: false,
        addedAt: formatMonthYear(entry.createdAt),
      })),
    [userSkills]
  );

  const verifiedCount = skills.filter((s) => s.verified !== null).length;

  function handleVerifiedPress(type: VerificationType) {
    const message =
      type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
      : type === "community" ? "Verificado por avaliações da comunidade de usuários."
      : "Verificação em análise pela equipe Krono.";
    setDialog({ title: VERIFICATION_LABELS[type], message });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Skills</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {skills.length} skills · {verifiedCount} verificadas
          </Text>
        </View>
        <Pressable style={[styles.addBtn, { borderColor: colors.surfaceBorder }]} onPress={() => router.push("/cadastro-skill")}>
          <Feather name="plus" size={11} color={colors.textSecondary} />
          <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
      >
        {skills.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="tool" size={28} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>nenhuma skill cadastrada</Text>
          </View>
        )}
        {skills.map((skill) => (
          <SkillListCard
            key={skill.id}
            name={skill.name}
            description={skill.description}
            isNew={skill.isNew}
            verifiedBadge={
              skill.verified
                ? <VerifiedBadge onPress={() => skill.verified && handleVerifiedPress(skill.verified.type)} />
                : undefined
            }
            onPress={() => router.push(`/skill/${skill.id}` as any)}
          />
        ))}
      </ScrollView>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        buttons={dialog?.buttons}
        onDismiss={() => setDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontFamily: "Sora_700Bold", fontSize: 19 },
  meta: { fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 10 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
});
