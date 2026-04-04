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
import { SkillListCard } from "@/components/SkillListCard";
import { ToolListCard } from "@/components/ToolListCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useServices } from "@/context/ServicesContext";
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
              <VerifiedBadge onPress={() => skill.verified && onVerifiedPress(skill.verified.type)} />
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
          <SkillListCard
            key={skill.id}
            name={skill.name}
            description={skill.description}
            isNew={skill.isNew}
            verifiedBadge={skill.verified ? <VerifiedBadge onPress={() => skill.verified && onVerifiedPress(skill.verified.type)} /> : undefined}
            onPress={() => onSelectSkill(skill)}
          />
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
          <ToolListCard
            key={tool.id}
            name={tool.name}
            iconName={tool.icon}
            description={`${tool.type} · ${tool.details}`}
            badge={tool.available ? "disponível" : "indisponível"}
            available={tool.available}
            verifiedBadge={tool.verified ? <VerifiedBadge onPress={() => tool.verified && onVerifiedPress(tool.verified.type)} /> : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors } = useTheme();
  const { isActive } = useServices();
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
              {hasVerified && <VerifiedBadge onPress={() => handleVerifiedPress("documentation")} />}
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
            <View style={[styles.compactIcon, { backgroundColor: colors.menuIconBg, borderColor: "#ff6b3520" }]}>
              <Feather name="box" size={16} color="#ff6b35" />
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
            <Pressable style={[styles.addBtn, { borderColor: colors.surfaceBorder }]} onPress={() => router.push("/cadastro-service")}>
              <Feather name="plus" size={11} color={colors.textSecondary} />
              <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {MY_PROFILE.services.map((sv) => {
              const skill = MY_PROFILE.skills.find((s) => s.id === sv.skillId);
              const tools = MY_PROFILE.tools.filter((t) => sv.toolIds.includes(t.id));
              const active = isActive(sv.id);
              return (
                <Pressable key={sv.id} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: active ? 1 : 0.45 }]} onPress={() => router.push(`/service/${sv.id}`)}>
                  <View style={styles.serviceTopRow}>
                    <Text style={[styles.serviceName, { color: colors.text }]}>{sv.name}</Text>
                    {!active && (
                      <View style={[styles.inactiveBadge, { borderColor: colors.surfaceBorder }]}>
                        <Text style={[styles.inactiveBadgeText, { color: colors.textDim }]}>INATIVO</Text>
                      </View>
                    )}
                    <Text style={[styles.serviceRate, { color: active ? "#ff6b35" : colors.textDim }]}>R${sv.hourlyRate}/h</Text>
                  </View>
                  <View style={styles.compositionRow}>
                    {skill && (
                      <View style={styles.compositionChip}>
                        <Feather name="star" size={9} color="#ff6b35" />
                        <Text style={styles.compositionChipText} numberOfLines={1}>{skill.name}</Text>
                      </View>
                    )}
                    {tools.map((t) => (
                      <View key={t.id} style={styles.compositionChip}>
                        <Feather name="tool" size={9} color="#ff6b35" />
                        <Text style={styles.compositionChipText} numberOfLines={1}>{t.name}</Text>
                      </View>
                    ))}
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
  inactiveBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveBadgeText: { fontFamily: "DMMono_500Medium", fontSize: 8, letterSpacing: 1 },
  serviceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 },
  serviceName: { fontFamily: "Sora_600SemiBold", fontSize: 14, flex: 1 },
  serviceRate: { fontFamily: "DMMono_500Medium", fontSize: 13, flexShrink: 0 },
  compositionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  compositionChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ff6b3512", borderWidth: 1, borderColor: "#ff6b3528", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  compositionChipText: { fontFamily: "DMMono_400Regular", fontSize: 10, color: "#ff6b35", maxWidth: 120 },
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
  skillDetailContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 },
  descriptionCard: { borderWidth: 1, borderRadius: 16, padding: 18 },
  descriptionLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  descriptionText: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "DMMono_400Regular", fontSize: 13 },
});
