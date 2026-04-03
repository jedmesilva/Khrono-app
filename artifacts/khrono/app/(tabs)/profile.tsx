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
import { LocationSheet, LocationMode, formatRadius } from "@/components/LocationSheet";
import { useTheme } from "@/context/ThemeContext";
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

function SkillDetailView({ skill, colors, onBack, onVerifiedPress }: {
  skill: Skill;
  colors: any;
  onBack: () => void;
  onVerifiedPress: (type: VerificationType) => void;
}) {
  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.nameWithBadge}>
            <Text style={[styles.subTitle, { color: colors.text }]} numberOfLines={1}>{skill.name}</Text>
            {skill.verified && (
              <VerifiedBadge type={skill.verified.type} onPress={() => skill.verified && onVerifiedPress(skill.verified.type)} />
            )}
          </View>
          {skill.isNew ? (
            <Text style={[styles.newSkillTag, { color: colors.textMuted }]}>skill nova · sem atividade ainda</Text>
          ) : null}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.skillDetailContent}>
        {skill.description ? (
          <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.descriptionLabel, { color: colors.textMuted }]}>DESCRIÇÃO</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{skill.description}</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="file-text" size={28} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>sem descrição</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function SkillsListView({ colors, onBack, onSelectSkill, onVerifiedPress, onAdd }: {
  colors: any;
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
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subTitle, { color: colors.text }]}>Skills</Text>
          <Text style={[styles.subMeta, { color: colors.textMuted }]}>
            {MY_PROFILE.skills.length} skills · {verifiedCount} verificadas
          </Text>
        </View>
        <Pressable style={[styles.addBtn, { borderColor: colors.surfaceBorder }]} onPress={onAdd}>
          <Feather name="plus" size={11} color={colors.textSecondary} />
          <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 10 }}>
        {MY_PROFILE.skills.map((skill) => (
          <Pressable key={skill.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => onSelectSkill(skill)}>
            <View style={[styles.listIcon, { backgroundColor: colors.menuIconBg, borderColor: skill.isNew ? colors.cardBorder : "#ff6b3520" }]}>
              <Feather name="tool" size={18} color={skill.isNew ? colors.textMuted : "#ff6b35"} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameWithBadge}>
                <Text style={[styles.listCardName, { flex: 1, color: colors.text }]} numberOfLines={1}>{skill.name}</Text>
                {skill.verified && (
                  <VerifiedBadge type={skill.verified.type} onPress={() => skill.verified && onVerifiedPress(skill.verified.type)} />
                )}
              </View>
              {skill.description ? (
                <Text style={[styles.listCardSub, { color: colors.textMuted }]} numberOfLines={1}>{skill.description}</Text>
              ) : null}
            </View>
            <Feather name="chevron-right" size={16} color={colors.chevron} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ToolsListView({ colors, onBack, onVerifiedPress, onAdd }: {
  colors: any;
  onBack: () => void;
  onVerifiedPress: (type: VerificationType) => void;
  onAdd: () => void;
}) {
  const verifiedCount = MY_PROFILE.tools.filter((t) => t.verified !== null).length;

  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subTitle, { color: colors.text }]}>Tools</Text>
          <Text style={[styles.subMeta, { color: colors.textMuted }]}>
            {MY_PROFILE.tools.length} tools · {verifiedCount} verificadas
          </Text>
        </View>
        <Pressable style={[styles.addBtn, { borderColor: colors.surfaceBorder }]} onPress={onAdd}>
          <Feather name="plus" size={11} color={colors.textSecondary} />
          <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 10 }}>
        {MY_PROFILE.tools.map((tool) => (
          <View key={tool.id} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: tool.available ? 1 : 0.55 }]}>
            <View style={[styles.listIcon, { borderColor: tool.available ? "#00e5a020" : colors.surfaceBorder, backgroundColor: tool.available ? "#00e5a010" : colors.surface }]}>
              <Feather name={tool.icon} size={18} color={tool.available ? "#00e5a0" : colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameWithBadge}>
                <Text style={[styles.listCardName, { flex: 1, color: colors.text }]} numberOfLines={1}>{tool.name}</Text>
                {tool.verified && (
                  <VerifiedBadge type={tool.verified.type} onPress={() => tool.verified && onVerifiedPress(tool.verified.type)} />
                )}
              </View>
              <View style={styles.toolMetaRow}>
                <Text style={[styles.listCardSub, { color: colors.textMuted }]}>{tool.type}</Text>
                <View style={[styles.availBadge, { backgroundColor: tool.available ? "#00e5a015" : colors.surface, borderColor: tool.available ? "#00e5a025" : colors.surfaceBorder }]}>
                  <Text style={[styles.availBadgeText, { color: tool.available ? "#00e5a0" : colors.textMuted }]}>
                    {tool.available ? "disponível" : "indisponível"}
                  </Text>
                </View>
              </View>
              <Text style={[styles.toolDetails, { color: colors.textDim }]} numberOfLines={1}>{tool.details}</Text>
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
  const { colors } = useTheme();
  const [view, setView] = useState<ViewState>("main");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>("realtime");
  const [fixedAddress, setFixedAddress] = useState("Belo Horizonte, MG");
  const [serviceRadius, setServiceRadius] = useState(5000);
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
      message: type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
        : type === "community" ? "Verificado por avaliações da comunidade de usuários."
        : "Verificação em análise pela equipe Krono.",
    });
  }

  if (view === "skill_detail" && selectedSkill) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <SkillDetailView skill={selectedSkill} colors={colors} onBack={() => { setSelectedSkill(null); setView("skills"); }} onVerifiedPress={handleVerifiedPress} />
        <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      </View>
    );
  }

  if (view === "skills") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <SkillsListView colors={colors} onBack={() => setView("main")} onSelectSkill={(skill) => { setSelectedSkill(skill); setView("skill_detail"); }} onVerifiedPress={handleVerifiedPress} onAdd={() => router.push("/cadastro-skill")} />
        <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      </View>
    );
  }

  if (view === "tools") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <ToolsListView colors={colors} onBack={() => setView("main")} onVerifiedPress={handleVerifiedPress} onAdd={() => router.push("/cadastro-tool")} />
        <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 20, paddingBottom: isWeb ? 34 + 84 + 20 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.text }]}>K<Text style={{ color: "#ff6b35" }}>r</Text>ono</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>perfil</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.avatarBg, borderColor: "#ff6b3530" }]}>
            <Text style={styles.avatarLargeText}>{MY_PROFILE.initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameWithBadge}>
              <Text style={[styles.profileName, { color: colors.text }]}>{MY_PROFILE.name}</Text>
              {hasVerified && <VerifiedBadge type="documentation" onPress={() => handleVerifiedPress("documentation")} />}
            </View>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color={colors.textMuted} />
              <Text style={[styles.locationText, { color: colors.textMuted }]}>{MY_PROFILE.location}</Text>
            </View>
            <Text style={[styles.sinceText, { color: colors.textDim }]}>membro desde {MY_PROFILE.since}</Text>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{MY_PROFILE.totalContracts}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>CONTRATOS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{MY_PROFILE.services.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>SERVICES</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{avgRating.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>AVALIAÇÃO</Text>
          </View>
        </View>

        {/* Location card */}
        <Pressable style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setLocationSheetOpen(true)}>
          <View style={[styles.locationIconWrap, locationMode === "realtime" ? { backgroundColor: "#00e5a015", borderColor: "#00e5a030" } : { backgroundColor: "#ff6b3515", borderColor: "#ff6b3530" }]}>
            <Feather name={locationMode === "realtime" ? "navigation" : "map-pin"} size={18} color={locationMode === "realtime" ? "#00e5a0" : "#ff6b35"} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.locationTopRow}>
              <Text style={[styles.locationLabel, { color: colors.textMuted }]}>Localização de serviço</Text>
              <View style={[styles.locationModeBadge, locationMode === "realtime" ? { backgroundColor: "#00e5a015", borderColor: "#00e5a025" } : { backgroundColor: "#ff6b3515", borderColor: "#ff6b3525" }]}>
                <Text style={[styles.locationModeBadgeText, { color: locationMode === "realtime" ? "#00e5a0" : "#ff6b35" }]}>
                  {locationMode === "realtime" ? "Tempo real" : "Fixa"}
                </Text>
              </View>
            </View>
            <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>
              {locationMode === "realtime" ? "GPS ativo" : fixedAddress}{" · raio "}{formatRadius(serviceRadius)}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.chevron} />
        </Pressable>

        {/* Skills + Tools compact */}
        <View style={styles.compactRow}>
          <Pressable style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setView("skills")}>
            <View style={[styles.compactIcon, { backgroundColor: colors.menuIconBg, borderColor: "#ff6b3520" }]}>
              <Feather name="tool" size={16} color="#ff6b35" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.compactTitle, { color: colors.text }]}>Skills</Text>
              <Text style={[styles.compactMeta, { color: colors.textDim }]}>{MY_PROFILE.skills.length} · {verifiedSkillsCount} verificadas</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.chevron} />
          </Pressable>
          <Pressable style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setView("tools")}>
            <View style={[styles.compactIcon, { backgroundColor: colors.menuIconBg, borderColor: "#00e5a020" }]}>
              <Feather name="box" size={16} color="#00e5a0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.compactTitle, { color: colors.text }]}>Tools</Text>
              <Text style={[styles.compactMeta, { color: colors.textDim }]}>{MY_PROFILE.tools.length} · {verifiedToolsCount} verificadas</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.chevron} />
          </Pressable>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Services</Text>
            <Pressable style={[styles.addBtn, { borderColor: colors.surfaceBorder }]} onPress={() => setDialog({ title: "Em breve", message: "Criação de services em breve." })}>
              <Feather name="plus" size={11} color={colors.textSecondary} />
              <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {MY_PROFILE.services.map((sv) => {
              const skill = MY_PROFILE.skills.find((s) => s.id === sv.skillId);
              const tools = MY_PROFILE.tools.filter((t) => sv.toolIds.includes(t.id));
              return (
                <Pressable key={sv.id} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => router.push(`/service/${sv.id}`)}>
                  <View style={styles.serviceTopRow}>
                    <Text style={[styles.serviceName, { color: colors.text }]}>{sv.name}</Text>
                    <Text style={styles.serviceRate}>R${sv.hourlyRate}/h</Text>
                  </View>
                  <View style={styles.compositionRow}>
                    {skill && (
                      <View style={styles.compositionItem}>
                        <Feather name="star" size={10} color="#ff6b35" />
                        <Text style={styles.compositionSkill} numberOfLines={1}>{skill.name}</Text>
                        {skill.verified && <View style={styles.compVerifiedDot} />}
                      </View>
                    )}
                    {tools.length > 0 && (
                      <View style={styles.compositionItem}>
                        <Feather name="key" size={10} color="#00e5a0" />
                        <Text style={styles.compositionTool} numberOfLines={1}>{tools.map((t) => t.name).join(", ")}</Text>
                      </View>
                    )}
                  </View>
                  {!sv.isNew ? (
                    <View style={styles.serviceRatingRow}>
                      <Feather name="star" size={10} color="#ff6b35" />
                      <Text style={[styles.serviceRatingText, { color: colors.textSecondary }]}>{sv.rating} · {sv.reviews} avaliações · {sv.contracts} contratos</Text>
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

      <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      <LocationSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        mode={locationMode}
        fixedAddress={fixedAddress}
        serviceRadius={serviceRadius}
        onSave={(mode, address, radius) => {
          setLocationMode(mode);
          if (mode === "fixed") setFixedAddress(address);
          setServiceRadius(radius);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  logo: { fontFamily: "Sora_700Bold", fontSize: 24, letterSpacing: -0.5 },
  headerSub: { fontFamily: "DMMono_400Regular", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  avatarSection: { flexDirection: "row", gap: 16, alignItems: "flex-start", marginBottom: 20 },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarLargeText: { fontFamily: "DMMono_500Medium", fontSize: 22, color: "#ff6b35" },
  profileInfo: { flex: 1, paddingTop: 4 },
  profileName: { fontFamily: "Sora_700Bold", fontSize: 18 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, marginBottom: 2 },
  locationText: { fontFamily: "DMMono_400Regular", fontSize: 12 },
  sinceText: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0d1f33", borderWidth: 1, borderColor: "#1a3a5c", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  verifiedBadgeText: { fontFamily: "DMMono_500Medium", fontSize: 9, color: "#4a9eff" },
  nameWithBadge: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  statsCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginBottom: 16 },
  statItem: { alignItems: "center" },
  statValue: { fontFamily: "DMMono_500Medium", fontSize: 20, marginBottom: 2 },
  statLabel: { fontFamily: "DMMono_400Regular", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" },
  statDivider: { width: 1, height: 30 },
  locationCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  locationIconWrap: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  locationTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  locationLabel: { fontFamily: "DMMono_400Regular", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", flex: 1 },
  locationModeBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  locationModeBadgeText: { fontFamily: "DMMono_500Medium", fontSize: 9, letterSpacing: 0.5 },
  locationAddress: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  compactRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  compactCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  compactIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  compactTitle: { fontFamily: "Sora_600SemiBold", fontSize: 13, marginBottom: 2 },
  compactMeta: { fontFamily: "DMMono_400Regular", fontSize: 9 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontFamily: "Sora_700Bold", fontSize: 14 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addBtnText: { fontFamily: "DMMono_400Regular", fontSize: 11 },
  list: { gap: 10 },
  serviceCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  serviceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  serviceName: { fontFamily: "Sora_600SemiBold", fontSize: 14, flex: 1, marginRight: 8 },
  serviceRate: { fontFamily: "DMMono_500Medium", fontSize: 13, color: "#ff6b35", flexShrink: 0 },
  compositionRow: { gap: 6, marginBottom: 10 },
  compositionItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  compositionSkill: { fontFamily: "DMMono_400Regular", fontSize: 11, color: "#ff6b35cc", flex: 1 },
  compositionTool: { fontFamily: "DMMono_400Regular", fontSize: 11, color: "#00e5a0cc", flex: 1 },
  compVerifiedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#4a9eff", flexShrink: 0 },
  serviceRatingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  serviceRatingText: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  newBadgeWrap: { flexDirection: "row" },
  newBadge: { backgroundColor: "#00e5a015", borderWidth: 1, borderColor: "#00e5a025", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 9, color: "#00e5a0" },
  subContainer: { flex: 1 },
  subHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { padding: 4 },
  subTitle: { fontFamily: "Sora_700Bold", fontSize: 16 },
  subMeta: { fontFamily: "DMMono_400Regular", fontSize: 10, marginTop: 2 },
  newSkillTag: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  listCard: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  listIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  listCardName: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  listCardSub: { fontFamily: "DMMono_400Regular", fontSize: 11, marginTop: 2 },
  toolMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  availBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 },
  availBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 9 },
  toolDetails: { fontFamily: "DMMono_400Regular", fontSize: 11, marginTop: 2 },
  skillDetailContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 },
  descriptionCard: { borderWidth: 1, borderRadius: 16, padding: 18 },
  descriptionLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  descriptionText: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "DMMono_400Regular", fontSize: 13 },
});
