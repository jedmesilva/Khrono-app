import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { LocationSheet, LocationMode } from "@/components/LocationSheet";
import Colors from "@/constants/colors";
import {
  MY_PROFILE,
  Skill,
  Tool,
  VERIFICATION_LABELS,
  VerificationType,
} from "@/constants/profile-data";

type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;
type ViewState = "main" | "skills" | "skill_detail" | "tools";

function VerifiedBadge({ type, onPress }: { type: VerificationType; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.verifiedBadge}>
      <Feather name="check-circle" size={9} color="#4a9eff" />
      <Text style={styles.verifiedBadgeText}>Verificado</Text>
    </Pressable>
  );
}

function SkillDetailView({ skill, onBack, onVerifiedPress }: {
  skill: Skill;
  onBack: () => void;
  onVerifiedPress: (type: VerificationType) => void;
}) {
  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.nameWithBadge}>
            <Text style={styles.subTitle} numberOfLines={1}>{skill.name}</Text>
            {skill.verified && (
              <VerifiedBadge
                type={skill.verified.type}
                onPress={() => skill.verified && onVerifiedPress(skill.verified.type)}
              />
            )}
          </View>
          {skill.isNew ? (
            <Text style={styles.newSkillTag}>skill nova · sem atividade ainda</Text>
          ) : null}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.skillDetailContent}>
        {skill.description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>DESCRIÇÃO</Text>
            <Text style={styles.descriptionText}>{skill.description}</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="file-text" size={28} color="#333" />
            <Text style={styles.emptyText}>sem descrição</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function SkillsListView({ onBack, onSelectSkill, onVerifiedPress, onAdd }: {
  onBack: () => void;
  onSelectSkill: (skill: Skill) => void;
  onVerifiedPress: (type: VerificationType) => void;
  onAdd: () => void;
}) {
  const verifiedCount = MY_PROFILE.skills.filter((s) => s.verified !== null).length;

  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.subTitle}>Skills</Text>
          <Text style={styles.subMeta}>
            {MY_PROFILE.skills.length} skills · {verifiedCount} verificadas
          </Text>
        </View>
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Feather name="plus" size={11} color="#555" />
          <Text style={styles.addBtnText}>adicionar</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 10 }}>
        {MY_PROFILE.skills.map((skill) => (
          <Pressable key={skill.id} style={styles.listCard} onPress={() => onSelectSkill(skill)}>
            <View style={[styles.listIcon, { borderColor: skill.isNew ? "#1e1e1e" : Colors.accent + "20" }]}>
              <Feather name="tool" size={18} color={skill.isNew ? "#444" : Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameWithBadge}>
                <Text style={[styles.listCardName, { flex: 1 }]} numberOfLines={1}>{skill.name}</Text>
                {skill.verified && (
                  <VerifiedBadge
                    type={skill.verified.type}
                    onPress={() => skill.verified && onVerifiedPress(skill.verified.type)}
                  />
                )}
              </View>
              {skill.description ? (
                <Text style={styles.listCardSub} numberOfLines={1} ellipsizeMode="tail">
                  {skill.description}
                </Text>
              ) : null}
            </View>
            <Feather name="chevron-right" size={16} color="#2a2a2a" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ToolsListView({ onBack, onVerifiedPress, onAdd }: {
  onBack: () => void;
  onVerifiedPress: (type: VerificationType) => void;
  onAdd: () => void;
}) {
  const verifiedCount = MY_PROFILE.tools.filter((t) => t.verified !== null).length;

  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.subTitle}>Tools</Text>
          <Text style={styles.subMeta}>
            {MY_PROFILE.tools.length} tools · {verifiedCount} verificadas
          </Text>
        </View>
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Feather name="plus" size={11} color="#555" />
          <Text style={styles.addBtnText}>adicionar</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 10 }}>
        {MY_PROFILE.tools.map((tool) => (
          <View key={tool.id} style={[styles.listCard, { opacity: tool.available ? 1 : 0.55 }]}>
            <View style={[styles.listIcon, { borderColor: tool.available ? Colors.accentGreen + "20" : "#1e1e1e" }]}>
              <Feather name={tool.icon} size={18} color={tool.available ? Colors.accentGreen : "#444"} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameWithBadge}>
                <Text style={[styles.listCardName, { flex: 1 }]} numberOfLines={1}>{tool.name}</Text>
                {tool.verified && (
                  <VerifiedBadge
                    type={tool.verified.type}
                    onPress={() => tool.verified && onVerifiedPress(tool.verified.type)}
                  />
                )}
              </View>
              <View style={styles.toolMetaRow}>
                <Text style={styles.listCardSub}>{tool.type}</Text>
                <View style={[
                  styles.availBadge,
                  {
                    backgroundColor: tool.available ? Colors.accentGreen + "15" : "#1e1e1e",
                    borderColor: tool.available ? Colors.accentGreen + "25" : "#2a2a2a",
                  },
                ]}>
                  <Text style={[styles.availBadgeText, { color: tool.available ? Colors.accentGreen : "#444" }]}>
                    {tool.available ? "disponível" : "indisponível"}
                  </Text>
                </View>
              </View>
              <Text style={styles.toolDetails} numberOfLines={1}>{tool.details}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [view, setView] = useState<ViewState>("main");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>("realtime");
  const [fixedAddress, setFixedAddress] = useState("Belo Horizonte, MG");
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const verifiedSkillsCount = MY_PROFILE.skills.filter((s) => s.verified !== null).length;
  const verifiedToolsCount = MY_PROFILE.tools.filter((t) => t.verified !== null).length;
  const hasVerified = verifiedSkillsCount > 0 || verifiedToolsCount > 0;

  const avgRating =
    MY_PROFILE.services.filter((s) => s.rating > 0).reduce((sum, s) => sum + s.rating, 0) /
      (MY_PROFILE.services.filter((s) => s.rating > 0).length || 1);

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

  if (view === "skill_detail" && selectedSkill) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, paddingTop: topPadding + 20 }]}>
        <SkillDetailView
          skill={selectedSkill}
          onBack={() => { setSelectedSkill(null); setView("skills"); }}
          onVerifiedPress={handleVerifiedPress}
        />
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

  if (view === "skills") {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, paddingTop: topPadding + 20 }]}>
        <SkillsListView
          onBack={() => setView("main")}
          onSelectSkill={(skill) => { setSelectedSkill(skill); setView("skill_detail"); }}
          onVerifiedPress={handleVerifiedPress}
          onAdd={() => router.push("/cadastro-skill")}
        />
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

  if (view === "tools") {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, paddingTop: topPadding + 20 }]}>
        <ToolsListView
          onBack={() => setView("main")}
          onVerifiedPress={handleVerifiedPress}
          onAdd={() => router.push("/cadastro-tool")}
        />
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

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding + 20,
            paddingBottom: isWeb ? 34 + 84 + 20 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            K<Text style={{ color: Colors.accent }}>r</Text>ono
          </Text>
          <Text style={styles.headerSub}>perfil</Text>
        </View>

        {/* Avatar + Info */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{MY_PROFILE.initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameWithBadge}>
              <Text style={styles.profileName}>{MY_PROFILE.name}</Text>
              {hasVerified && (
                <VerifiedBadge
                  type="documentation"
                  onPress={() => handleVerifiedPress("documentation")}
                />
              )}
            </View>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color="#555" />
              <Text style={styles.locationText}>{MY_PROFILE.location}</Text>
            </View>
            <Text style={styles.sinceText}>membro desde {MY_PROFILE.since}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{MY_PROFILE.totalContracts}</Text>
            <Text style={styles.statLabel}>CONTRATOS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{MY_PROFILE.services.length}</Text>
            <Text style={styles.statLabel}>SERVICES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>AVALIAÇÃO</Text>
          </View>
        </View>

        {/* Location card */}
        <Pressable style={styles.locationCard} onPress={() => setLocationSheetOpen(true)}>
          <View style={[
            styles.locationIconWrap,
            locationMode === "realtime"
              ? { backgroundColor: Colors.accentGreen + "15", borderColor: Colors.accentGreen + "30" }
              : { backgroundColor: Colors.accent + "15", borderColor: Colors.accent + "30" },
          ]}>
            <Feather
              name={locationMode === "realtime" ? "navigation" : "map-pin"}
              size={18}
              color={locationMode === "realtime" ? Colors.accentGreen : Colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.locationTopRow}>
              <Text style={styles.locationLabel}>Localização de serviço</Text>
              <View style={[
                styles.locationModeBadge,
                locationMode === "realtime"
                  ? { backgroundColor: Colors.accentGreen + "15", borderColor: Colors.accentGreen + "25" }
                  : { backgroundColor: Colors.accent + "15", borderColor: Colors.accent + "25" },
              ]}>
                <Text style={[
                  styles.locationModeBadgeText,
                  { color: locationMode === "realtime" ? Colors.accentGreen : Colors.accent },
                ]}>
                  {locationMode === "realtime" ? "Tempo real" : "Fixa"}
                </Text>
              </View>
            </View>
            <Text style={styles.locationAddress}>
              {locationMode === "realtime" ? `${fixedAddress} · GPS ativo` : fixedAddress}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#2a2a2a" />
        </Pressable>

        {/* Skills + Tools compact cards */}
        <View style={styles.compactRow}>
          <Pressable style={styles.compactCard} onPress={() => setView("skills")}>
            <View style={[styles.compactIcon, { borderColor: Colors.accent + "20" }]}>
              <Feather name="tool" size={16} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compactTitle}>Skills</Text>
              <Text style={styles.compactMeta}>
                {MY_PROFILE.skills.length} · {verifiedSkillsCount} verificadas
              </Text>
            </View>
            <Feather name="chevron-right" size={14} color="#2a2a2a" />
          </Pressable>

          <Pressable style={styles.compactCard} onPress={() => setView("tools")}>
            <View style={[styles.compactIcon, { borderColor: Colors.accentGreen + "20" }]}>
              <Feather name="box" size={16} color={Colors.accentGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.compactTitle}>Tools</Text>
              <Text style={styles.compactMeta}>
                {MY_PROFILE.tools.length} · {verifiedToolsCount} verificadas
              </Text>
            </View>
            <Feather name="chevron-right" size={14} color="#2a2a2a" />
          </Pressable>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services</Text>
            <Pressable
              style={styles.addBtn}
              onPress={() => setDialog({ title: "Em breve", message: "Criação de services em breve." })}
            >
              <Feather name="plus" size={11} color="#555" />
              <Text style={styles.addBtnText}>adicionar</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {MY_PROFILE.services.map((sv) => {
              const skill = MY_PROFILE.skills.find((s) => s.id === sv.skillId);
              const tools = MY_PROFILE.tools.filter((t) => sv.toolIds.includes(t.id));

              return (
                <Pressable
                  key={sv.id}
                  style={styles.serviceCard}
                  onPress={() => router.push(`/service/${sv.id}`)}
                >
                  {/* Service name + rate */}
                  <View style={styles.serviceTopRow}>
                    <Text style={styles.serviceName}>{sv.name}</Text>
                    <Text style={styles.serviceRate}>R${sv.hourlyRate}/h</Text>
                  </View>

                  {/* Composition */}
                  <View style={styles.compositionRow}>
                    {skill && (
                      <View style={styles.compositionItem}>
                        <Feather name="star" size={10} color={Colors.accent} />
                        <Text style={styles.compositionSkill} numberOfLines={1}>{skill.name}</Text>
                        {skill.verified && (
                          <View style={styles.compVerifiedDot} />
                        )}
                      </View>
                    )}
                    {tools.length > 0 && (
                      <View style={styles.compositionItem}>
                        <Feather name="key" size={10} color={Colors.accentGreen} />
                        <Text style={styles.compositionTool} numberOfLines={1}>
                          {tools.map((t) => t.name).join(", ")}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Rating */}
                  {!sv.isNew ? (
                    <View style={styles.serviceRatingRow}>
                      <Feather name="star" size={10} color={Colors.accent} />
                      <Text style={styles.serviceRatingText}>
                        {sv.rating} · {sv.reviews} avaliações · {sv.contracts} contratos
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.newBadgeWrap}>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>novo</Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        buttons={dialog?.buttons}
        onDismiss={() => setDialog(null)}
      />

      <LocationSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        mode={locationMode}
        fixedAddress={fixedAddress}
        onSave={(mode, address) => {
          setLocationMode(mode);
          if (mode === "fixed") setFixedAddress(address);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  avatarSection: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#161616",
    borderWidth: 2,
    borderColor: Colors.accent + "30",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarLargeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 22,
    color: Colors.accent,
    fontWeight: "700",
  },
  profileInfo: { flex: 1, paddingTop: 4 },
  profileName: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    marginBottom: 2,
  },
  locationText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
  },
  sinceText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
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
    flexShrink: 0,
  },
  verifiedBadgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 9,
    color: "#4a9eff",
  },

  nameWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },

  statsCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  statItem: { alignItems: "center" },
  statValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 20,
    color: "#fff",
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 8,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  statDivider: { width: 1, height: 30, backgroundColor: "#1a1a1a" },

  locationCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  locationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  locationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  locationLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    flex: 1,
  },
  locationModeBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  locationModeBadgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },

  compactRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  compactCard: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#161616",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  compactTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
    marginBottom: 2,
  },
  compactMeta: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
  },

  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtnText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
  },
  list: { gap: 10 },

  serviceCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
  },
  serviceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  serviceName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
    flex: 1,
    marginRight: 8,
  },
  serviceRate: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    color: Colors.accent,
    flexShrink: 0,
  },
  compositionRow: {
    gap: 6,
    marginBottom: 10,
  },
  compositionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compositionSkill: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: Colors.accent + "cc",
    flex: 1,
  },
  compositionTool: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: Colors.accentGreen + "cc",
    flex: 1,
  },
  compVerifiedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#4a9eff",
    flexShrink: 0,
  },
  serviceRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  serviceRatingText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#555",
  },
  newBadgeWrap: { flexDirection: "row" },
  newBadge: {
    backgroundColor: Colors.accentGreen + "15",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "25",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: Colors.accentGreen,
  },

  subContainer: { flex: 1 },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { padding: 4 },
  subTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  subMeta: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    marginTop: 2,
  },
  newSkillTag: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#555",
  },

  listCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  listCardName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  listCardSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    marginTop: 2,
  },
  toolMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  availBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  availBadgeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
  },
  toolDetails: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
    marginTop: 2,
  },

  skillDetailContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 100,
  },
  descriptionCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 18,
  },
  descriptionLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  descriptionText: {
    fontFamily: "Sora_400Regular",
    fontSize: 13,
    color: "#888",
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#333",
  },
});
