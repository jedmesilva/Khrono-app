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

import { AppDialog } from "@/components/AppDialog";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useServices } from "@/context/ServicesContext";
import { useTheme } from "@/context/ThemeContext";
import { MY_PROFILE, VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";

type ExpandedCard = "rating" | "reviews" | "contracts" | null;

function StarRow({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={size} color="#ff6b35" style={{ opacity: s <= rating ? 1 : 0.2 }} />
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
  const [dialog, setDialog] = useState<{ title: string; message?: string } | null>(null);

  const service = MY_PROFILE.services.find((s) => s.id === id);

  if (!service) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Service não encontrado.</Text>
      </View>
    );
  }

  const active = isActive(service.id);
  const skill = MY_PROFILE.skills.find((s) => s.id === service.skillId);
  const tools = MY_PROFILE.tools.filter((t) => service.toolIds.includes(t.id));

  function handleVerifiedPress(type: VerificationType) {
    setDialog({
      title: VERIFICATION_LABELS[type],
      message: type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
        : type === "community" ? "Verificado por avaliações da comunidade de usuários."
        : "Verificação em análise pela equipe Krono.",
    });
  }

  function toggleCard(card: ExpandedCard) { setExpanded((prev) => (prev === card ? null : card)); }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#ff6b35" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.serviceTitle, { color: active ? colors.text : colors.textDim }]}>{service.name}</Text>
            <Text style={[styles.serviceRate, { color: active ? "#ff6b35" : colors.textDim }]}>R${service.hourlyRate}/h</Text>
          </View>
          <Pressable
            onPress={() => toggleActive(service.id)}
            style={[
              styles.toggleBtn,
              { borderColor: active ? "#ff6b3540" : colors.surfaceBorder },
              active && { backgroundColor: "#ff6b3510" },
            ]}
          >
            <View style={[styles.toggleDot, { backgroundColor: active ? "#ff6b35" : colors.textDim }]} />
            <Text style={[styles.toggleText, { color: active ? "#ff6b35" : colors.textDim }]}>
              {active ? "ATIVO" : "INATIVO"}
            </Text>
          </Pressable>
        </View>

        {/* Composition */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>COMPOSIÇÃO</Text>

          {skill && (
            <View style={styles.compositionRow}>
              <View style={[styles.compIcon, { borderColor: "#ff6b3525", backgroundColor: "#ff6b3510" }]}>
                <Feather name="star" size={13} color="#ff6b35" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.compLabel, { color: colors.textMuted }]}>Skill</Text>
                <View style={styles.compNameRow}>
                  <Text style={styles.compSkillName}>{skill.name}</Text>
                  {skill.verified && (
                    <VerifiedBadge onPress={() => skill.verified && handleVerifiedPress(skill.verified.type)} />
                  )}
                </View>
              </View>
            </View>
          )}

          {tools.length > 0 && (
            <View style={[styles.compositionRow, { marginTop: 12 }]}>
              <View style={[styles.compIcon, { borderColor: "#ff6b3525", backgroundColor: "#ff6b3510" }]}>
                <Feather name="key" size={13} color="#ff6b35" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.compLabel, { color: colors.textMuted }]}>Tools</Text>
                <View style={{ gap: 4, marginTop: 2 }}>
                  {tools.map((tool) => (
                    <View key={tool.id} style={styles.compNameRow}>
                      <Text style={styles.compToolName}>{tool.name}</Text>
                      {tool.verified && (
                        <VerifiedBadge onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {tools.length === 0 && (
            <View style={[styles.compositionRow, { marginTop: 12 }]}>
              <View style={[styles.compIcon, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
                <Feather name="key" size={13} color={colors.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.compLabel, { color: colors.textMuted }]}>Tools</Text>
                <Text style={[styles.compEmptyText, { color: colors.textDim }]}>sem tools vinculadas</Text>
              </View>
            </View>
          )}
        </View>

        {/* Performance cards */}
        {!service.isNew ? (
          <View style={styles.performanceGrid}>
            {([
              { key: "rating" as const, value: service.rating.toFixed(1), label: "NOTA", expandContent: (
                <View style={styles.perfExpandedInner}>
                  <StarRow rating={Math.round(service.rating)} size={14} />
                  <Text style={[styles.perfExpandedText, { color: colors.textSecondary }]}>Baseado em {service.reviews} avaliações</Text>
                </View>
              )},
              { key: "reviews" as const, value: String(service.reviews), label: "AVALIAÇÕES", expandContent: (
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
              )},
              { key: "contracts" as const, value: String(service.contracts), label: "CONTRATOS", expandContent: (
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
              )},
            ]).map((item) => (
              <Pressable key={item.key} style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }, expanded === item.key && { borderColor: colors.surfaceBorder }]} onPress={() => toggleCard(item.key)}>
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

      <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} onDismiss={() => setDialog(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 24 },
  backBtn: { padding: 4, marginTop: 2, flexShrink: 0 },
  serviceTitle: { fontFamily: "Sora_700Bold", fontSize: 20, marginBottom: 4 },
  serviceRate: { fontFamily: "DMMono_500Medium", fontSize: 14 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0, marginTop: 2 },
  toggleDot: { width: 6, height: 6, borderRadius: 3 },
  toggleText: { fontFamily: "DMMono_500Medium", fontSize: 9, letterSpacing: 1 },
  errorText: { fontFamily: "Sora_400Regular", fontSize: 14, marginTop: 20, paddingHorizontal: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 16 },
  cardLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 },
  compositionRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  compIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  compLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  compNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  compSkillName: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#ff6b35dd" },
  compToolName: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#ff6b35dd" },
  compEmptyText: { fontFamily: "DMMono_400Regular", fontSize: 11 },
  performanceGrid: { gap: 10, marginBottom: 16 },
  perfCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  perfCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  perfCardValue: { fontFamily: "DMMono_500Medium", fontSize: 26 },
  perfCardLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" },
  perfExpanded: { marginTop: 16, borderTopWidth: 1, paddingTop: 14 },
  perfExpandedInner: { gap: 8, alignItems: "flex-start" },
  perfExpandedText: { fontFamily: "DMMono_400Regular", fontSize: 11 },
  reviewItem: { paddingVertical: 12 },
  reviewItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  reviewAuthor: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  reviewText: { fontFamily: "Sora_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 6 },
  reviewDate: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  contractItem: { paddingVertical: 10 },
  contractRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  contractClient: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  contractValue: { fontFamily: "DMMono_500Medium", fontSize: 12, color: "#00e5a0" },
  contractMeta: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  emptyPerf: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyPerfText: { fontFamily: "DMMono_400Regular", fontSize: 13 },
  emptyPerfSub: { fontFamily: "DMMono_400Regular", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 17 },
});
