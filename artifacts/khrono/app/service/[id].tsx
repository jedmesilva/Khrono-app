import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useServices } from "@/context/ServicesContext";
import { useTheme } from "@/context/ThemeContext";
import { MY_PROFILE, VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";

type ExpandedCard = "rating" | "reviews" | "contracts" | null;
type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;

function StarRow({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={size} color="#e06030" style={{ opacity: s <= rating ? 1 : 0.2 }} />
      ))}
    </View>
  );
}

export default function ServiceDetailScreen() {
  const { colors } = useTheme();
  const { isActive, toggleActive } = useServices();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [expanded, setExpanded] = useState<ExpandedCard>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const service = MY_PROFILE.services.find((s) => s.id === id);

  if (!service) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#e06030" />
        </Pressable>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Service não encontrado.</Text>
      </View>
    );
  }

  const active = isActive(service.id);
  const skill = MY_PROFILE.skills.find((s) => s.id === service.skillId);
  const tools = MY_PROFILE.tools.filter((t) => service.toolIds.includes(t.id));

  function handleVerifiedPress(type: VerificationType, context?: "service") {
    const message = context === "service"
      ? type === "documentation" ? "Serviço verificado por documentação e histórico de contratos na plataforma Krono."
        : type === "community" ? "Serviço verificado pela comunidade com base em avaliações e contratos."
        : "Verificação do serviço em análise pela equipe Krono."
      : type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
        : type === "community" ? "Verificado por avaliações da comunidade de usuários."
        : "Verificação em análise pela equipe Krono.";
    setDialog({ title: VERIFICATION_LABELS[type], message });
  }

  function handleMoreOptions() {
    setDialog({
      title: service.name,
      buttons: [
        {
          label: "Editar service",
          onPress: () => { setDialog(null); router.push("/cadastro-service"); },
        },
        {
          label: "Excluir service",
          style: "destructive",
          onPress: () => {
            setDialog({
              title: "Excluir service?",
              message: `"${service.name}" será removido do seu perfil permanentemente.`,
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

  function toggleCard(card: ExpandedCard) {
    setExpanded((prev) => (prev === card ? null : card));
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Header: voltar + nome + verificado + mais opções */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#e06030" />
          </Pressable>
          <View style={styles.headerNameWrap}>
            <Text style={[styles.serviceTitle, { color: active ? colors.text : colors.textDim }]} numberOfLines={2}>
              {service.name}
            </Text>
            {service.verified && (
              <VerifiedBadge onPress={() => service.verified && handleVerifiedPress(service.verified.type, "service")} />
            )}
          </View>
          <Pressable
            style={[styles.moreBtn, { borderColor: colors.surfaceBorder }]}
            onPress={handleMoreOptions}
          >
            <Feather name="more-horizontal" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Linha de metadata: categoria + status + preço */}
        <View style={styles.metaRow}>
          <View style={styles.metaBadgesLeft}>
            {skill?.type && (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{skill.type}</Text>
              </View>
            )}
            <View style={[
              styles.statusBadge,
              { backgroundColor: active ? "#18a06b12" : colors.surface, borderColor: active ? "#18a06b30" : colors.surfaceBorder },
            ]}>
              <View style={[styles.statusDot, { backgroundColor: active ? "#18a06b" : colors.textDim }]} />
              <Text style={[styles.statusText, { color: active ? "#18a06b" : colors.textDim }]}>
                {active ? "ativo" : "inativo"}
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.toggleBtn, { borderColor: active ? "#e0603040" : colors.surfaceBorder }, active && { backgroundColor: "#e0603010" }]}
            onPress={() => toggleActive(service.id)}
          >
            <Text style={[styles.toggleText, { color: active ? "#e06030" : colors.textDim }]}>
              {active ? "desativar" : "ativar"}
            </Text>
          </Pressable>
        </View>

        {/* Preço em destaque */}
        <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>VALOR POR HORA</Text>
          <Text style={[styles.priceValue, { color: active ? "#e06030" : colors.textDim }]}>R${service.hourlyRate}<Text style={styles.priceUnit}>/h</Text></Text>
        </View>

        {/* Detalhes */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>DETALHES</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailItemLabel, { color: colors.textDim }]}>CATEGORIA</Text>
              <Text style={[styles.detailItemValue, { color: colors.text }]}>{skill?.type ?? "—"}</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.detailItem}>
              <Text style={[styles.detailItemLabel, { color: colors.textDim }]}>ADICIONADO EM</Text>
              <Text style={[styles.detailItemValue, { color: colors.text }]}>{service.addedAt}</Text>
            </View>
          </View>
        </View>

        {/* Composição: mesma linguagem visual do card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>COMPOSIÇÃO</Text>

          {/* Skill */}
          {skill ? (
            <View style={styles.compItem}>
              <View style={[styles.compIconWrap, { backgroundColor: "#ff6b3312", borderColor: "#e0603028" }]}>
                <Feather name="star" size={13} color="#e06030" />
              </View>
              <View style={styles.compBody}>
                <Text style={[styles.compTypeLabel, { color: colors.textDim }]}>SKILL</Text>
                <View style={styles.compNameRow}>
                  <Text style={[styles.compName, { color: colors.text }]} numberOfLines={1}>{skill.name}</Text>
                  {skill.verified && (
                    <VerifiedBadge onPress={() => skill.verified && handleVerifiedPress(skill.verified.type)} />
                  )}
                </View>
                <Text style={[styles.compDetail, { color: colors.textMuted }]}>{skill.type} · adicionada {skill.addedAt}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.compItem}>
              <View style={[styles.compIconWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Feather name="star" size={13} color={colors.textDim} />
              </View>
              <Text style={[styles.compEmpty, { color: colors.textDim }]}>sem skill vinculada</Text>
            </View>
          )}

          {/* Tools */}
          <View style={[styles.compDivider, { borderTopColor: colors.divider }]}>
            <Text style={[styles.compSectionLabel, { color: colors.textDim }]}>TOOLS</Text>
            {tools.length > 0 ? tools.map((tool) => (
              <View key={tool.id} style={styles.compItem}>
                <View style={[styles.compIconWrap, { backgroundColor: tool.available ? "#ff6b3312" : colors.surface, borderColor: tool.available ? "#e0603028" : colors.surfaceBorder }]}>
                  <Feather name={tool.icon} size={13} color={tool.available ? "#e06030" : colors.textDim} />
                </View>
                <View style={styles.compBody}>
                  <View style={styles.compNameRow}>
                    <Text style={[styles.compName, { color: tool.available ? colors.text : colors.textMuted }]} numberOfLines={1}>{tool.name}</Text>
                    {tool.verified && (
                      <VerifiedBadge onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)} />
                    )}
                  </View>
                  <Text style={[styles.compDetail, { color: colors.textMuted }]}>
                    {tool.type} · {tool.available ? "disponível" : "indisponível"}
                  </Text>
                </View>
              </View>
            )) : (
              <View style={styles.compItem}>
                <View style={[styles.compIconWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <Feather name="tool" size={13} color={colors.textDim} />
                </View>
                <Text style={[styles.compEmpty, { color: colors.textDim }]}>sem tools vinculadas</Text>
              </View>
            )}
          </View>
        </View>

        {/* Performance */}
        {!service.isNew ? (
          <View style={styles.performanceGrid}>
            {([
              {
                key: "rating" as const,
                value: service.rating.toFixed(1),
                label: "NOTA",
                expandContent: (
                  <View style={styles.perfExpandedInner}>
                    <StarRow rating={Math.round(service.rating)} size={14} />
                    <Text style={[styles.perfExpandedText, { color: colors.textSecondary }]}>
                      Baseado em {service.reviews} avaliações
                    </Text>
                  </View>
                ),
              },
              {
                key: "reviews" as const,
                value: String(service.reviews),
                label: "AVALIAÇÕES",
                expandContent: (
                  <View>
                    {service.reviewsList.map((r, i) => (
                      <View key={i} style={[styles.reviewItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.surface }]}>
                        <View style={styles.reviewItemHeader}>
                          <Text style={[styles.reviewAuthor, { color: colors.text }]}>{r.author}</Text>
                          <StarRow rating={r.rating} size={9} />
                        </View>
                        <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{r.text}</Text>
                        <Text style={[styles.reviewDate, { color: colors.textDim }]}>{r.date}</Text>
                      </View>
                    ))}
                  </View>
                ),
              },
              {
                key: "contracts" as const,
                value: String(service.contracts),
                label: "CONTRATOS",
                expandContent: (
                  <View>
                    {service.contractsList.map((c, i) => (
                      <View key={i} style={[styles.contractItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.surface }]}>
                        <View style={styles.contractRow}>
                          <Text style={[styles.contractClient, { color: colors.text }]}>{c.client}</Text>
                          <Text style={styles.contractValue}>{c.value}</Text>
                        </View>
                        <Text style={[styles.contractMeta, { color: colors.textMuted }]}>{c.date} · {c.duration}</Text>
                      </View>
                    ))}
                  </View>
                ),
              },
            ]).map((item) => (
              <Pressable
                key={item.key}
                style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }, expanded === item.key && { borderColor: colors.surfaceBorder }]}
                onPress={() => toggleCard(item.key)}
              >
                <View style={styles.perfCardHeader}>
                  <Text style={[styles.perfCardValue, { color: colors.text }]}>{item.value}</Text>
                  <Feather name={expanded === item.key ? "chevron-up" : "chevron-down"} size={12} color={colors.textMuted} />
                </View>
                <Text style={[styles.perfCardLabel, { color: colors.textMuted }]}>{item.label}</Text>
                {expanded === item.key && (
                  <View style={[styles.perfExpanded, { borderTopColor: colors.surface }]}>{item.expandContent}</View>
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPerf}>
            <Feather name="clock" size={28} color={colors.textDim} />
            <Text style={[styles.emptyPerfText, { color: colors.textDim }]}>service novo · sem atividade ainda</Text>
            <Text style={[styles.emptyPerfSub, { color: colors.textMuted }]}>os dados aparecerão após o primeiro contrato</Text>
          </View>
        )}

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
  content: { paddingHorizontal: 20, paddingTop: 4 },
  errorText: { fontFamily: "Sora_400Regular", fontSize: 14, marginTop: 20, paddingHorizontal: 20 },

  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  backBtn: { padding: 4, marginTop: 3, flexShrink: 0 },
  headerNameWrap: { flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  serviceTitle: { fontFamily: "Sora_700Bold", fontSize: 20, lineHeight: 26, flexShrink: 1 },
  moreBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 16 },
  metaBadgesLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" },
  categoryTag: { backgroundColor: "#e0603012", borderWidth: 1, borderColor: "#e0603028", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  categoryTagText: { fontFamily: "DMSans_500Medium", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: "#e06030" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 0.5 },
  toggleBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, flexShrink: 0 },
  toggleText: { fontFamily: "DMSans_500Medium", fontSize: 9, letterSpacing: 0.8 },

  priceCard: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" },
  priceValue: { fontFamily: "DMSans_500Medium", fontSize: 28 },
  priceUnit: { fontFamily: "DMSans_400Regular", fontSize: 14 },

  card: { borderWidth: 1, borderRadius: 24, padding: 18, marginBottom: 12 },
  cardLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 },

  detailsGrid: { flexDirection: "row", alignItems: "center" },
  detailItem: { flex: 1 },
  detailItemLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  detailItemValue: { fontFamily: "Sora_600SemiBold", fontSize: 14 },
  detailDivider: { width: 1, height: 36, marginHorizontal: 16 },

  compItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 2 },
  compIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  compBody: { flex: 1, gap: 2 },
  compTypeLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1, textTransform: "uppercase" },
  compNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  compName: { fontFamily: "Sora_600SemiBold", fontSize: 13, flexShrink: 1 },
  compDetail: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  compEmpty: { fontFamily: "DMSans_400Regular", fontSize: 11, alignSelf: "center" },
  compDivider: { borderTopWidth: 1, marginTop: 14, paddingTop: 14, gap: 10 },
  compSectionLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },

  performanceGrid: { gap: 10, marginBottom: 16 },
  perfCard: { borderWidth: 1, borderRadius: 24, padding: 16 },
  perfCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  perfCardValue: { fontFamily: "DMSans_500Medium", fontSize: 26 },
  perfCardLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" },
  perfExpanded: { marginTop: 16, borderTopWidth: 1, paddingTop: 14 },
  perfExpandedInner: { gap: 8, alignItems: "flex-start" },
  perfExpandedText: { fontFamily: "DMSans_400Regular", fontSize: 11 },

  reviewItem: { paddingVertical: 12 },
  reviewItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  reviewAuthor: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  reviewText: { fontFamily: "Sora_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 6 },
  reviewDate: { fontFamily: "DMSans_400Regular", fontSize: 10 },

  contractItem: { paddingVertical: 10 },
  contractRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  contractClient: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  contractValue: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#18a06b" },
  contractMeta: { fontFamily: "DMSans_400Regular", fontSize: 10 },

  emptyPerf: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyPerfText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  emptyPerfSub: { fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 17 },
});
