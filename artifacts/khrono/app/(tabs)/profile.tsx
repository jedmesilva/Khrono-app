import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { PageHeader } from "@/components/PageHeader";
import { LocationSheet, formatRadius } from "@/components/LocationSheet";
import { PunctualidadeCard, PunctualidadeStats, computePunctualidade } from "@/components/PunctualidadeCard";
import { ServiceCard } from "@/components/ServiceCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ProfileReadinessSheet } from "@/components/ProfileReadinessSheet";
import { useAvailability } from "@/context/AvailabilityContext";
import { useAuth } from "@/context/AuthContext";
import { useCatalog } from "@/context/CatalogContext";
import { useContracts } from "@/context/ContractsContext";
import { useServices } from "@/context/ServicesContext";
import { formatMonthYear } from "@/context/ServicesContext";
import { useTheme } from "@/context/ThemeContext";
import { useUserCatalog } from "@/context/UserCatalogContext";
import { useLocation } from "@/context/LocationContext";
import { supabase } from "@/lib/supabase";
import {
  Skill,
  Tool,
  VERIFICATION_LABELS,
  VerificationType,
} from "@/constants/profile-data";

type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;

function getInitials(name: string): string {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isActive, myServices, myTools } = useServices();
  const { history } = useContracts();
  const { userSkills } = useUserCatalog();
  const { skills: catalogSkills } = useCatalog();
  const { location, saveLocation } = useLocation();
  const { profileReadiness, refreshProfileReadiness } = useAvailability();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [readinessSheetOpen, setReadinessSheetOpen] = useState(false);
  const [memberSince, setMemberSince] = useState<string>("");
  const [punctuality, setPunctuality] = useState<PunctualidadeStats | null>(null);
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.created_at) setMemberSince(formatMonthYear(data.created_at));
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("contracts")
      .select("scheduled_for, started_at")
      .eq("hired_id", user.id)
      .eq("agendado", true)
      .not("started_at", "is", null)
      .then(({ data }) => {
        if (data) setPunctuality(computePunctualidade(data as any));
      });
  }, [user?.id]);

  const mappedSkills: Skill[] = useMemo(
    () =>
      userSkills.map((entry) => ({
        id: entry.skill_id,
        name: entry.skill?.nome ?? "",
        type: entry.skill?.category ?? "",
        description: entry.skill?.description ?? "",
        verified: entry.skill?.verified
          ? ({ type: "documentation" } as { type: VerificationType })
          : null,
        isNew: false,
        addedAt: formatMonthYear(entry.createdAt),
      })),
    [userSkills]
  );

  const userName = user?.name ?? user?.firstName ?? "Usuário";
  const userInitials = getInitials(userName);
  const verifiedSkillsCount = mappedSkills.filter((s) => s.verified !== null).length;
  const verifiedToolsCount = myTools.filter((t) => t.verified !== null).length;
  const hasVerified = verifiedSkillsCount > 0 || verifiedToolsCount > 0;
  const activeServicesCount = myServices.filter((service) => service.active).length;
  const hasActiveService = activeServicesCount > 0;
  const shouldShowReadinessCard = profileReadiness.checked
    ? !profileReadiness.ready
    : !hasActiveService;

  useEffect(() => {
    refreshProfileReadiness();
  }, [refreshProfileReadiness, activeServicesCount, myServices.length]);

  function handleVerifiedPress(type: VerificationType, context?: "service") {
    const baseMessage =
      type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
      : type === "community" ? "Verificado por avaliações da comunidade de usuários."
      : "Verificação em análise pela equipe Krono.";
    const message =
      context === "service"
        ? type === "documentation" ? "Serviço verificado por documentação e histórico de contratos na plataforma Krono."
          : type === "community" ? "Serviço verificado pela comunidade com base em avaliações e contratos."
          : "Verificação do serviço em análise pela equipe Krono."
        : baseMessage;
    setDialog({ title: VERIFICATION_LABELS[type], message });
  }


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 20, paddingBottom: isWeb ? 34 + 84 + 20 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <PageHeader title="Perfil" />

        <View style={styles.avatarSection}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.avatarBg }]}>
            <Text style={styles.avatarLargeText}>{userInitials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameWithBadge}>
              <Text style={[styles.profileName, { color: colors.text }]}>{userName}</Text>
              {hasVerified && <VerifiedBadge onPress={() => handleVerifiedPress("documentation")} />}
            </View>
            {memberSince ? (
              <Text style={[styles.sinceText, { color: colors.textDim }]}>membro desde {memberSince}</Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{history.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>CONTRATOS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{myServices.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>SERVICES</Text>
          </View>
        </View>

        {punctuality && (
          <PunctualidadeCard stats={punctuality} colors={colors} style={{ marginTop: 14 }} />
        )}

        {shouldShowReadinessCard ? (
          <Pressable
            style={[
              styles.readinessCard,
              { backgroundColor: colors.card, borderColor: "#e0903035" },
            ]}
            onPress={async () => {
              await refreshProfileReadiness();
              setLocationSheetOpen(false);
              setReadinessSheetOpen(true);
            }}
          >
            <View style={styles.readinessTopRow}>
              <View style={[styles.readinessIconWrap, { backgroundColor: "#e0903012" }]}>
                <Feather name="alert-circle" size={18} color="#e09030" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.readinessTitle, { color: colors.text }]}>
                  Complete seu perfil para receber contratos
                </Text>
                <Text style={[styles.readinessSubtitle, { color: colors.textMuted }]}>
                  Cadastre pelo menos 1 serviço ativo antes de ficar disponível.
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.chevron} />
            </View>

            <View style={[styles.readinessProgressBg, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  styles.readinessProgressFill,
                  { width: hasActiveService ? "100%" : "0%" },
                ]}
              />
            </View>

            <View style={styles.readinessCheckRow}>
              <View
                style={[
                  styles.readinessCheckIcon,
                  {
                    backgroundColor: hasActiveService ? "#18a06b12" : "#e0903012",
                    borderColor: hasActiveService ? "#18a06b30" : "#e0903030",
                  },
                ]}
              >
                <Feather
                  name={hasActiveService ? "check" : "x"}
                  size={12}
                  color={hasActiveService ? "#18a06b" : "#e09030"}
                />
              </View>
              <Text style={[styles.readinessCheckText, { color: colors.textSecondary }]}>
                {hasActiveService
                  ? `${activeServicesCount} serviço ativo cadastrado`
                  : "Nenhum serviço ativo cadastrado"}
              </Text>
              {!hasActiveService ? (
                <Pressable
                  style={[styles.readinessAction, { borderColor: "#e0603040" }]}
                  onPress={() => router.push("/cadastro-service")}
                >
                  <Text style={styles.readinessActionText}>Adicionar</Text>
                  <Feather name="arrow-right" size={11} color="#e06030" />
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        ) : null}

        {/* Location card */}
        <Pressable style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setLocationSheetOpen(true)}>
          <View style={[styles.locationIconWrap, { backgroundColor: colors.menuIconBg }]}>
            <Feather name={location.mode === "realtime" ? "navigation" : "map-pin"} size={18} color={colors.iconBack} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.locationTopRow}>
              <Text style={[styles.locationLabel, { color: colors.textMuted }]}>Localização de serviço</Text>
              <View style={[styles.locationModeBadge, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Text style={[styles.locationModeBadgeText, { color: colors.textSecondary }]}>
                  {location.mode === "realtime" ? "Tempo real" : "Fixa"}
                </Text>
              </View>
            </View>
            <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>
              {location.mode === "realtime" ? "Minha localização" : (location.fixedAddress || "—")}{" · raio "}{formatRadius(location.serviceRadiusMeters)}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.chevron} />
        </Pressable>

        {/* Skills + Tools compact */}
        <View style={styles.compactRow}>
          <Pressable style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => router.push("/skills")}>
            <View style={[styles.compactIcon, { backgroundColor: colors.menuIconBg }]}>
              <Feather name="tool" size={16} color="#e06030" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.compactTitle, { color: colors.text }]}>Skills</Text>
              <Text style={[styles.compactMeta, { color: colors.textDim }]}>{mappedSkills.length} · {verifiedSkillsCount} verificadas</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.chevron} />
          </Pressable>
          <Pressable style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => router.push("/tools")}>
            <View style={[styles.compactIcon, { backgroundColor: colors.menuIconBg }]}>
              <Feather name="box" size={16} color="#e06030" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.compactTitle, { color: colors.text }]}>Tools</Text>
              <Text style={[styles.compactMeta, { color: colors.textDim }]}>{myTools.length} · {verifiedToolsCount} verificadas</Text>
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

          {myServices.length === 0 ? (
            <View style={[styles.emptyServices, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Feather name="layers" size={28} color={colors.textDim} />
              <Text style={[styles.emptyServicesText, { color: colors.textDim }]}>nenhum service cadastrado</Text>
              <Text style={[styles.emptyServicesSub, { color: colors.textMuted }]}>adicione seu primeiro service para começar a receber contratos</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {myServices.map((sv) => {
                const skills: Skill[] = sv.skillIds
                  .map((skillId) => {
                    const cs = catalogSkills.find((s) => s.id === skillId);
                    if (!cs) return null;
                    return {
                      id: cs.id,
                      name: cs.nome,
                      type: cs.category ?? "",
                      description: cs.description ?? "",
                      verified: cs.verified ? ({ type: "documentation" as VerificationType }) : null,
                      isNew: false,
                      addedAt: "",
                    } as Skill;
                  })
                  .filter((s): s is Skill => s !== null);
                const tools = myTools.filter((t) => sv.toolIds.includes(t.id));
                const active = isActive(sv.id);
                return (
                  <ServiceCard
                    key={sv.id}
                    service={sv}
                    skills={skills}
                    tools={tools}
                    active={active}
                    colors={colors}
                    onPress={() => router.push(`/service/${sv.id}`)}
                    onVerifiedPress={handleVerifiedPress}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      <LocationSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        mode={location.mode}
        fixedAddress={location.fixedAddress}
        fixedLat={location.fixedLat}
        fixedLng={location.fixedLng}
        serviceRadius={location.serviceRadiusMeters}
        realtimeUpdatedAt={location.realtimeUpdatedAt}
        onSave={(mode, address, radius, lat, lng) => {
          saveLocation(mode, address, radius, lat, lng);
        }}
      />
      <ProfileReadinessSheet
        visible={readinessSheetOpen}
        readiness={profileReadiness}
        onClose={() => setReadinessSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  avatarLarge: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarLargeText: { fontFamily: "Sora_700Bold", fontSize: 26, color: "#e06030" },
  profileInfo: { flex: 1, gap: 4 },
  nameWithBadge: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  profileName: { fontFamily: "Sora_700Bold", fontSize: 20, flexShrink: 1 },
  sinceText: { fontFamily: "DMSans_400Regular", fontSize: 11 },

  statsCard: { flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 18, marginBottom: 12 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontFamily: "DMSans_500Medium", fontSize: 22 },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase" },
  statDivider: { width: 1, height: 32, marginHorizontal: 8 },

  readinessCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 12, gap: 12 },
  readinessTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  readinessIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  readinessTitle: { fontFamily: "Sora_700Bold", fontSize: 14, letterSpacing: -0.2 },
  readinessSubtitle: { fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
  readinessProgressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  readinessProgressFill: { height: "100%", borderRadius: 3, backgroundColor: "#18a06b" },
  readinessCheckRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  readinessCheckIcon: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  readinessCheckText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17 },
  readinessAction: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  readinessActionText: { fontFamily: "Sora_600SemiBold", fontSize: 11, color: "#e06030" },

  locationCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 20, padding: 16, marginBottom: 12 },
  locationIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  locationTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  locationLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase" },
  locationModeBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  locationModeBadgeText: { fontFamily: "DMSans_500Medium", fontSize: 8, letterSpacing: 0.5 },
  locationAddress: { fontFamily: "Sora_400Regular", fontSize: 12 },

  compactRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  compactCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, padding: 14 },
  compactIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  compactTitle: { fontFamily: "Sora_700Bold", fontSize: 13 },
  compactMeta: { fontFamily: "DMSans_400Regular", fontSize: 9 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontFamily: "Sora_700Bold", fontSize: 17 },
  list: { gap: 12 },

  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { fontFamily: "DMSans_400Regular", fontSize: 10 },

  emptyServices: { borderRadius: 20, padding: 28, alignItems: "center", gap: 10 },
  emptyServicesText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  emptyServicesSub: { fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 17 },
});
