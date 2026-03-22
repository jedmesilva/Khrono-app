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
import Colors from "@/constants/colors";
import { MY_PROFILE, VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";

type ExpandedCard = "rating" | "reviews" | "contracts" | null;

function StarRow({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={size}
          color={Colors.accent}
          style={{ opacity: s <= rating ? 1 : 0.2 }}
        />
      ))}
    </View>
  );
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [expanded, setExpanded] = useState<ExpandedCard>(null);
  const [dialog, setDialog] = useState<{ title: string; message?: string } | null>(null);

  const service = MY_PROFILE.services.find((s) => s.id === id);

  if (!service) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <Text style={styles.errorText}>Service não encontrado.</Text>
      </View>
    );
  }

  const skill = MY_PROFILE.skills.find((s) => s.id === service.skillId);
  const tools = MY_PROFILE.tools.filter((t) => service.toolIds.includes(t.id));

  function handleVerifiedPress(type: VerificationType) {
    setDialog({
      title: VERIFICATION_LABELS[type],
      message:
        type === "documentation"
          ? "Identidade e documentação verificadas pela equipe Krono."
          : type === "community"
          ? "Verificado por avaliações da comunidade de usuários."
          : "Verificação em análise pela equipe Krono.",
    });
  }

  function toggleCard(card: ExpandedCard) {
    setExpanded((prev) => (prev === card ? null : card));
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Back header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={Colors.accent} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceTitle}>{service.name}</Text>
            <Text style={styles.serviceRate}>R${service.hourlyRate}/h</Text>
          </View>
        </View>

        {/* Composition */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>COMPOSIÇÃO</Text>

          {skill && (
            <View style={styles.compositionRow}>
              <View style={[styles.compIcon, { borderColor: Colors.accent + "25", backgroundColor: Colors.accent + "10" }]}>
                <Feather name="star" size={13} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.compLabel}>Skill</Text>
                <View style={styles.compNameRow}>
                  <Text style={styles.compSkillName}>{skill.name}</Text>
                  {skill.verified && (
                    <Pressable style={styles.verifiedBadge} onPress={() => skill.verified && handleVerifiedPress(skill.verified.type)}>
                      <Feather name="check-circle" size={9} color="#4a9eff" />
                      <Text style={styles.verifiedBadgeText}>Verificado</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          )}

          {tools.length > 0 && (
            <View style={[styles.compositionRow, { marginTop: 12 }]}>
              <View style={[styles.compIcon, { borderColor: Colors.accentGreen + "25", backgroundColor: Colors.accentGreen + "10" }]}>
                <Feather name="key" size={13} color={Colors.accentGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.compLabel}>Tools</Text>
                <View style={{ gap: 4, marginTop: 2 }}>
                  {tools.map((tool) => (
                    <View key={tool.id} style={styles.compNameRow}>
                      <Text style={styles.compToolName}>{tool.name}</Text>
                      {tool.verified && (
                        <Pressable style={styles.verifiedBadge} onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)}>
                          <Feather name="check-circle" size={9} color="#4a9eff" />
                          <Text style={styles.verifiedBadgeText}>Verificado</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {tools.length === 0 && (
            <View style={[styles.compositionRow, { marginTop: 12 }]}>
              <View style={[styles.compIcon, { borderColor: "#1e1e1e", backgroundColor: "#161616" }]}>
                <Feather name="key" size={13} color="#333" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.compLabel}>Tools</Text>
                <Text style={styles.compEmptyText}>sem tools vinculadas</Text>
              </View>
            </View>
          )}
        </View>

        {/* Performance cards */}
        {!service.isNew ? (
          <View style={styles.performanceGrid}>
            {/* Nota */}
            <Pressable
              style={[styles.perfCard, expanded === "rating" && styles.perfCardExpanded]}
              onPress={() => toggleCard("rating")}
            >
              <View style={styles.perfCardHeader}>
                <Text style={styles.perfCardValue}>{service.rating.toFixed(1)}</Text>
                <Feather
                  name={expanded === "rating" ? "chevron-up" : "chevron-down"}
                  size={12}
                  color="#444"
                />
              </View>
              <Text style={styles.perfCardLabel}>NOTA</Text>
              {expanded === "rating" && (
                <View style={styles.perfExpanded}>
                  <View style={styles.perfExpandedInner}>
                    <StarRow rating={Math.round(service.rating)} size={14} />
                    <Text style={styles.perfExpandedText}>
                      Baseado em {service.reviews} avaliações
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>

            {/* Avaliações */}
            <Pressable
              style={[styles.perfCard, expanded === "reviews" && styles.perfCardExpanded]}
              onPress={() => toggleCard("reviews")}
            >
              <View style={styles.perfCardHeader}>
                <Text style={styles.perfCardValue}>{service.reviews}</Text>
                <Feather
                  name={expanded === "reviews" ? "chevron-up" : "chevron-down"}
                  size={12}
                  color="#444"
                />
              </View>
              <Text style={styles.perfCardLabel}>AVALIAÇÕES</Text>
              {expanded === "reviews" && (
                <View style={styles.perfExpanded}>
                  {service.reviewsList.map((r, i) => (
                    <View key={i} style={[styles.reviewItem, i > 0 && styles.reviewItemBorder]}>
                      <View style={styles.reviewItemHeader}>
                        <Text style={styles.reviewAuthor}>{r.author}</Text>
                        <StarRow rating={r.rating} size={9} />
                      </View>
                      <Text style={styles.reviewText}>{r.text}</Text>
                      <Text style={styles.reviewDate}>{r.date}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Contratos */}
            <Pressable
              style={[styles.perfCard, expanded === "contracts" && styles.perfCardExpanded]}
              onPress={() => toggleCard("contracts")}
            >
              <View style={styles.perfCardHeader}>
                <Text style={styles.perfCardValue}>{service.contracts}</Text>
                <Feather
                  name={expanded === "contracts" ? "chevron-up" : "chevron-down"}
                  size={12}
                  color="#444"
                />
              </View>
              <Text style={styles.perfCardLabel}>CONTRATOS</Text>
              {expanded === "contracts" && (
                <View style={styles.perfExpanded}>
                  {service.contractsList.map((c, i) => (
                    <View key={i} style={[styles.contractItem, i > 0 && styles.reviewItemBorder]}>
                      <View style={styles.contractRow}>
                        <Text style={styles.contractClient}>{c.client}</Text>
                        <Text style={styles.contractValue}>{c.value}</Text>
                      </View>
                      <Text style={styles.contractMeta}>{c.date} · {c.duration}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyPerf}>
            <Feather name="clock" size={28} color="#333" />
            <Text style={styles.emptyPerfText}>service novo · sem atividade ainda</Text>
            <Text style={styles.emptyPerfSub}>os dados aparecerão após o primeiro contrato</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        onDismiss={() => setDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 24,
  },
  backBtn: {
    padding: 4,
    marginTop: 2,
    flexShrink: 0,
  },
  serviceTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 20,
    color: "#fff",
    marginBottom: 4,
  },
  serviceRate: {
    fontFamily: "DMMono_500Medium",
    fontSize: 14,
    color: Colors.accent,
  },
  errorText: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#555",
    marginTop: 20,
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  cardLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  compositionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  compIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  compLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  compNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  compSkillName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: Colors.accent + "dd",
  },
  compToolName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: Colors.accentGreen + "dd",
  },
  compEmptyText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d1f33",
    borderWidth: 1,
    borderColor: "#1a3a5c",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  verifiedBadgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 9,
    color: "#4a9eff",
  },

  performanceGrid: {
    gap: 10,
    marginBottom: 16,
  },
  perfCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
  },
  perfCardExpanded: {
    borderColor: "#222",
  },
  perfCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  perfCardValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 26,
    color: "#fff",
  },
  perfCardLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  perfExpanded: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#161616",
    paddingTop: 14,
  },
  perfExpandedInner: {
    gap: 8,
    alignItems: "flex-start",
  },
  perfExpandedText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
  },
  reviewItem: {
    paddingVertical: 12,
  },
  reviewItemBorder: {
    borderTopWidth: 1,
    borderTopColor: "#161616",
  },
  reviewItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewAuthor: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  reviewText: {
    fontFamily: "Sora_400Regular",
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    marginBottom: 6,
  },
  reviewDate: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
  },
  contractItem: {
    paddingVertical: 10,
  },
  contractRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  contractClient: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  contractValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 12,
    color: Colors.accentGreen,
  },
  contractMeta: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
  },

  emptyPerf: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 10,
  },
  emptyPerfText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#333",
  },
  emptyPerfSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#222",
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 17,
  },
});
