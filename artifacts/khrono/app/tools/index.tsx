import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { BackButton } from "@/components/BackButton";
import { ToolListCard } from "@/components/ToolListCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/context/ThemeContext";
import { useServices } from "@/context/ServicesContext";
import { VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { myTools } = useServices();
  const [dialog, setDialog] = useState<{ title: string; message?: string; buttons?: AppDialogButton[] } | null>(null);

  const verifiedCount = myTools.filter((t) => t.verified !== null).length;

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
          <Text style={[styles.title, { color: colors.text }]}>Tools</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {myTools.length} tools · {verifiedCount} verificadas
          </Text>
        </View>
        <Pressable
          style={[styles.addBtn, { borderColor: colors.surfaceBorder }]}
          onPress={() => router.push("/cadastro-tool")}
        >
          <Feather name="plus" size={11} color={colors.textSecondary} />
          <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
      >
        {myTools.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="box" size={28} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>nenhuma tool cadastrada</Text>
          </View>
        )}
        {myTools.map((tool) => (
          <ToolListCard
            key={tool.id}
            name={tool.name}
            iconName={tool.icon}
            description={`${tool.type}${tool.details ? ` · ${tool.details}` : ""}`}
            badge={tool.available ? "disponível" : "indisponível"}
            available={tool.available}
            verifiedBadge={
              tool.verified
                ? <VerifiedBadge onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)} />
                : undefined
            }
            onPress={() => router.push(`/tool/${tool.id}` as any)}
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
