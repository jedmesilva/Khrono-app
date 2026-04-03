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
import { PROVIDERS, VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";


export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [dialog, setDialog] = useState<{ title: string; message?: string } | null>(null);

  const provider = PROVIDERS.find((p) => p.id === id);

  if (!provider) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <Text style={styles.errorText}>Perfil não encontrado.</Text>
      </View>
    );
  }

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

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={Colors.accent} />
          </Pressable>
          <Text style={styles.screenLabel}>perfil</Text>
        </View>

        {/* Avatar + name */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{provider.initials}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{provider.name}</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{provider.totalContracts}</Text>
              <Text style={styles.statLabel}>contratos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{provider.services.length}</Text>
              <Text style={styles.statLabel}>services</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{provider.distancia} km</Text>
              <Text style={styles.statLabel}>distância</Text>
            </View>
          </View>
        </View>

        {/* Services */}
        <Text style={styles.sectionLabel}>services</Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {provider.services.map((service) => {
            const skill = provider.skills.find((s) => s.id === service.skillId);
            const tools = provider.tools.filter((t) => service.toolIds.includes(t.id));
            return (
              <Pressable
                key={service.id}
                style={styles.serviceCard}
                onPress={() =>
                  router.push(`/provider-service/${service.id}?profileId=${provider.id}` as any)
                }
              >
                <View style={styles.serviceTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.serviceMeta}>
                      {!service.isNew ? (
                        <>
                          <Feather name="star" size={10} color={Colors.accent} />
                          <Text style={styles.serviceMetaText}>
                            {service.rating.toFixed(1)} · {service.reviews} avaliações
                          </Text>
                          <Text style={styles.serviceMetaDot}>·</Text>
                          <Text style={styles.serviceMetaText}>{service.contracts} contratos</Text>
                        </>
                      ) : (
                        <Text style={[styles.serviceMetaText, { color: "#444" }]}>novo service</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.serviceRate}>R${service.hourlyRate}/h</Text>
                    <Feather name="chevron-right" size={14} color="#333" />
                  </View>
                </View>

                {/* Composition preview */}
                <View style={styles.serviceComposition}>
                  {skill && (
                    <View style={styles.compositionChip}>
                      <Feather name="star" size={9} color={Colors.accent} />
                      <Text style={styles.compositionChipText}>{skill.name}</Text>
                    </View>
                  )}
                  {tools.map((tool) => (
                    <View key={tool.id} style={[styles.compositionChip, styles.compositionChipGreen]}>
                      <Feather name="key" size={9} color={Colors.accentGreen} />
                      <Text style={[styles.compositionChipText, { color: Colors.accentGreen + "cc" }]}>
                        {tool.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Skills */}
        <Text style={styles.sectionLabel}>skills</Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {provider.skills.map((skill) => (
            <View key={skill.id} style={styles.skillCard}>
              <View style={styles.skillHeader}>
                <View style={styles.skillIconWrap}>
                  <Feather name="star" size={13} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.skillNameRow}>
                    <Text style={styles.skillName}>{skill.name}</Text>
                    {skill.verified && (
                      <Pressable
                        style={styles.verifiedBadge}
                        onPress={() => skill.verified && handleVerifiedPress(skill.verified.type)}
                      >
                        <Feather name="check-circle" size={9} color="#4a9eff" />
                        <Text style={styles.verifiedBadgeText}>Verificado</Text>
                      </Pressable>
                    )}
                    {skill.isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>novo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.skillDesc}>{skill.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Tools */}
        <Text style={styles.sectionLabel}>tools</Text>
        <View style={{ gap: 10, marginBottom: 40 }}>
          {provider.tools.map((tool) => (
            <View key={tool.id} style={styles.toolCard}>
              <View style={styles.toolIconWrap}>
                <Feather
                  name={tool.icon === "truck" ? "truck" : tool.icon === "tool" ? "tool" : "box"}
                  size={14}
                  color={Colors.accentGreen}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.toolNameRow}>
                  <Text style={styles.toolName}>{tool.name}</Text>
                  {tool.verified && (
                    <Pressable
                      style={styles.verifiedBadge}
                      onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)}
                    >
                      <Feather name="check-circle" size={9} color="#4a9eff" />
                      <Text style={styles.verifiedBadgeText}>Verificado</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.toolType}>{tool.type}</Text>
                <Text style={styles.toolDetails}>{tool.details}</Text>
              </View>
              <View style={[styles.availDot, { backgroundColor: tool.available ? Colors.accentGreen : "#333" }]} />
            </View>
          ))}
        </View>
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
  errorText: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#555",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  backBtn: {
    padding: 4,
    flexShrink: 0,
  },
  screenLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  profileCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 28,
  },
  avatarWrap: {
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent + "15",
    borderWidth: 2,
    borderColor: Colors.accent + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: Colors.accent,
  },
  profileName: {
    fontFamily: "Sora_700Bold",
    fontSize: 20,
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#161616",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#161616",
  },
  statValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 14,
    color: "#fff",
  },
  statLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  sectionLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  serviceCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  serviceTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  serviceName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
    marginBottom: 4,
  },
  serviceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  serviceMetaText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#555",
  },
  serviceMetaDot: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
  },
  serviceRate: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    color: Colors.accent,
  },
  serviceComposition: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  compositionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.accent + "10",
    borderWidth: 1,
    borderColor: Colors.accent + "20",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  compositionChipGreen: {
    backgroundColor: Colors.accentGreen + "10",
    borderColor: Colors.accentGreen + "20",
  },
  compositionChipText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: Colors.accent + "cc",
  },

  skillCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
  },
  skillHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  skillIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accent + "25",
    backgroundColor: Colors.accent + "10",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  skillNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  skillName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: Colors.accent + "dd",
  },
  skillDesc: {
    fontFamily: "Sora_400Regular",
    fontSize: 11,
    color: "#444",
    lineHeight: 16,
  },
  newBadge: {
    backgroundColor: "#1a2a1a",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "30",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: Colors.accentGreen,
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

  toolCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  toolIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accentGreen + "25",
    backgroundColor: Colors.accentGreen + "10",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  toolNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  toolName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: Colors.accentGreen + "dd",
  },
  toolType: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  toolDetails: {
    fontFamily: "Sora_400Regular",
    fontSize: 11,
    color: "#444",
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
});
