import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { BackButton } from "@/components/BackButton";
import { SimpleIconButton } from "@/components/SimpleIconButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/context/ThemeContext";
import { useServices } from "@/context/ServicesContext";
import { VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";

export default function ToolDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { myTools } = useServices();
  const [dialog, setDialog] = useState<{ title: string; message?: string; buttons?: AppDialogButton[] } | null>(null);

  const tool = myTools.find((t) => t.id === id) ?? null;

  function handleVerifiedPress(type: VerificationType) {
    const message =
      type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
      : type === "community" ? "Verificado por avaliações da comunidade de usuários."
      : "Verificação em análise pela equipe Krono.";
    setDialog({ title: VERIFICATION_LABELS[type], message });
  }

  function handleOptions() {
    if (!tool) return;
    setDialog({
      title: tool.name,
      buttons: [
        {
          label: "Editar tool",
          onPress: () => { setDialog(null); router.push("/cadastro-tool"); },
        },
        {
          label: "Excluir tool",
          style: "destructive",
          onPress: () => {
            setDialog({
              title: "Excluir tool?",
              message: `"${tool.name}" será removida do seu perfil permanentemente.`,
              buttons: [
                { label: "Cancelar", onPress: () => setDialog(null) },
                {
                  label: "Excluir",
                  style: "destructive",
                  onPress: () => { setDialog(null); router.back(); },
                },
              ],
            });
          },
        },
        { label: "Cancelar", onPress: () => setDialog(null) },
      ],
    });
  }

  if (!tool) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
        </View>
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={28} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.textDim }]}>tool não encontrada</Text>
        </View>
      </View>
    );
  }

  const iconColor = tool.available ? "#e06030" : colors.textMuted;
  const iconBg = tool.available ? "#e0603012" : colors.surface;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameWithBadge}>
            <Text style={[styles.title, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
              {tool.name}
            </Text>
            {tool.verified && (
              <VerifiedBadge onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)} />
            )}
          </View>
          <Text style={[styles.statusTag, { color: tool.available ? "#18a06b" : colors.textMuted }]}>
            {tool.available ? "disponível" : "indisponível"}
          </Text>
        </View>
        <SimpleIconButton icon="more-horizontal" onPress={handleOptions} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
      >
        <View style={[styles.iconCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.iconLarge, { backgroundColor: iconBg }]}>
            <Feather name={tool.icon} size={32} color={iconColor} />
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>TIPO</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{tool.type || "—"}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>ADICIONADA EM</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{tool.addedAt || "—"}</Text>
          </View>
        </View>

        <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.descriptionLabel, { color: colors.textMuted }]}>DETALHES</Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{tool.details || "—"}</Text>
        </View>

        <View style={{ height: 100 }} />
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
  nameWithBadge: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { fontFamily: "Sora_700Bold", fontSize: 19 },
  statusTag: { fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  iconCard: { borderRadius: 20, padding: 18, alignItems: "center", marginBottom: 12 },
  iconLarge: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  detailRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  detailCard: { flex: 1, borderRadius: 16, padding: 14, gap: 4 },
  detailLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase" },
  detailValue: { fontFamily: "Sora_600SemiBold", fontSize: 14 },
  descriptionCard: { borderRadius: 16, padding: 16, gap: 8 },
  descriptionLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase" },
  descriptionText: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
});
