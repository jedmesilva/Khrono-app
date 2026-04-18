import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/BackButton";
import { AppDialog } from "@/components/AppDialog";
import { formatRadius } from "@/components/LocationSheet";
import { PunctualidadeCard, PunctualidadeStats, computePunctualidade } from "@/components/PunctualidadeCard";
import { ServiceCard } from "@/components/ServiceCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/context/ThemeContext";
import { VERIFICATION_LABELS, VerificationType, type Skill, type Tool, type Service } from "@/constants/profile-data";
import { supabase } from "@/lib/supabase";
import { formatMonthYear } from "@/context/ServicesContext";

type LocationMode = "realtime" | "fixed";

type ProviderData = {
  id: string;
  name: string;
  initials: string;
  since: string;
  totalContracts: number;
  locationMode: LocationMode;
  serviceRadius: number;
  fixedAddress: string;
  skills: Skill[];
  tools: Tool[];
  services: Service[];
  serviceSkillsMap: Record<string, Skill[]>;
  serviceToolsMap: Record<string, Tool[]>;
  punctuality: PunctualidadeStats;
};

function getInitials(name: string): string {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function iconForTipo(tipo: string): "truck" | "tool" | "box" {
  const t = (tipo ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t === "veiculo") return "truck";
  if (t === "ferramenta") return "tool";
  return "box";
}

function PulsingDot({ size = 8 }: { size?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  React.useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.5, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
    opacity.value = withRepeat(withSequence(withTiming(0.1, { duration: 900 }), withTiming(0.6, { duration: 900 })), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <View style={{ width: size * 2.5, height: size * 2.5, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: size * 2, height: size * 2, borderRadius: size, backgroundColor: "#18a06b40" }, ringStyle]} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#18a06b" }} />
    </View>
  );
}

function ServiceAreaCard({ locationMode, serviceRadius, fixedAddress, colors }: {
  locationMode: LocationMode;
  serviceRadius: number;
  fixedAddress: string;
  colors: any;
}) {
  const isRealtime = locationMode === "realtime";

  return (
    <View style={[areaStyles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={areaStyles.topRow}>
        <View style={[areaStyles.iconWrap, { backgroundColor: colors.menuIconBg }]}>
          <Feather name={isRealtime ? "navigation" : "map-pin"} size={14} color={colors.iconBack} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[areaStyles.areaLabel, { color: colors.textSecondary }]}>Área de atendimento</Text>
          <Text style={[areaStyles.areaDesc, { color: colors.textMuted }]}>
            {isRealtime ? "Minha localização" : fixedAddress || "Localização fixa"}
            {" · raio "}{formatRadius(serviceRadius)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const areaStyles = StyleSheet.create({
  card: { borderRadius: 24, padding: 14, marginBottom: 28, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  areaLabel: { fontFamily: "Sora_600SemiBold", fontSize: 12, marginBottom: 2 },
  areaDesc: { fontFamily: "DMSans_400Regular", fontSize: 11 },
});

async function fetchProviderData(profileId: string): Promise<ProviderData | null> {
  const [profileRes, ppRes, servicesRes, skillsRes, toolsRes, locationRes, contractsRes, punctualityRes] = await Promise.all([
    supabase.from("profiles").select("id, name, first_name, created_at").eq("id", profileId).single(),
    supabase.from("provider_profiles").select("total_contracts, verified").eq("profile_id", profileId).single(),
    supabase.from("provider_services")
      .select(`id, nome, valor_hora, nota, avaliacoes, is_active, created_at, service_skills(skill_id, skill:skills_catalog(id, nome, category, verified)), service_tools(tool_id, tool:provider_tools(id, nome, tipo, details, is_available))`)
      .eq("profile_id", profileId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("user_skills")
      .select("skill_id, created_at, skill:skills_catalog(id, nome, category, description, verified)")
      .eq("profile_id", profileId),
    supabase.from("provider_tools").select("*").eq("profile_id", profileId),
    supabase.from("provider_locations").select("location_mode, service_radius_meters, fixed_address").eq("profile_id", profileId).single(),
    supabase.from("contracts").select("service_id").eq("hired_id", profileId).not("service_id", "is", null),
    supabase.from("contracts")
      .select("scheduled_for, started_at")
      .eq("hired_id", profileId)
      .eq("agendado", true)
      .not("started_at", "is", null),
  ]);

  if (!profileRes.data) return null;

  const profile = profileRes.data;
  const pp = ppRes.data;

  const contractsCountMap: Record<string, number> = {};
  if (contractsRes.data) {
    for (const c of contractsRes.data) {
      if (c.service_id) {
        contractsCountMap[c.service_id] = (contractsCountMap[c.service_id] ?? 0) + 1;
      }
    }
  }

  const tools: Tool[] = (toolsRes.data ?? []).map((t: any) => ({
    id: t.id,
    name: t.nome,
    type: t.tipo ?? "equipamento",
    icon: iconForTipo(t.tipo),
    details: t.details ?? "",
    available: Boolean(t.is_available),
    verified: null,
    addedAt: formatMonthYear(t.created_at),
  }));

  const skills: Skill[] = (skillsRes.data ?? []).map((entry: any) => {
    const cs = entry.skill as any;
    return {
      id: cs?.id ?? entry.skill_id,
      name: cs?.nome ?? "",
      type: cs?.category ?? "",
      description: cs?.description ?? "",
      verified: cs?.verified ? ({ type: "documentation" as VerificationType }) : null,
      isNew: false,
      addedAt: formatMonthYear(entry.created_at),
    };
  });

  const serviceSkillsMap: Record<string, Skill[]> = {};
  const serviceToolsMap: Record<string, Tool[]> = {};

  const services: Service[] = (servicesRes.data ?? []).map((row: any) => {
    const contractsCount = contractsCountMap[row.id] ?? 0;
    const skillIds: string[] = (row.service_skills ?? []).map((ss: any) => ss.skill_id as string);
    const toolIds: string[] = (row.service_tools ?? []).map((st: any) => st.tool_id as string);

    serviceSkillsMap[row.id] = (row.service_skills ?? []).map((ss: any) => {
      const cs = ss.skill as any;
      return {
        id: cs?.id ?? ss.skill_id,
        name: cs?.nome ?? "",
        type: cs?.category ?? "",
        description: cs?.description ?? "",
        verified: cs?.verified ? ({ type: "documentation" as VerificationType }) : null,
        isNew: false,
        addedAt: "",
      } as Skill;
    });

    serviceToolsMap[row.id] = (row.service_tools ?? []).map((st: any) => {
      const pt = st.tool as any;
      return {
        id: pt?.id ?? st.tool_id,
        name: pt?.nome ?? "",
        type: pt?.tipo ?? "equipamento",
        icon: iconForTipo(pt?.tipo ?? ""),
        details: pt?.details ?? "",
        available: Boolean(pt?.is_available),
        verified: null,
        addedAt: "",
      } as Tool;
    });

    return {
      id: row.id,
      name: row.nome,
      skillIds,
      toolIds,
      rating: Number(row.nota ?? 0),
      reviews: Number(row.avaliacoes ?? 0),
      contracts: contractsCount,
      hourlyRate: Number(row.valor_hora ?? 50),
      isNew: contractsCount < 10,
      active: Boolean(row.is_active),
      verified: null,
      addedAt: formatMonthYear(row.created_at),
      reviewsList: [],
      contractsList: [],
    };
  });

  const location = locationRes.data;
  const punctuality = computePunctualidade(
    (punctualityRes.data ?? []) as { scheduled_for: string | null; started_at: string | null }[]
  );

  return {
    id: profile.id,
    name: profile.name ?? profile.first_name ?? "Prestador",
    initials: getInitials(profile.name ?? profile.first_name ?? ""),
    since: formatMonthYear(profile.created_at),
    totalContracts: Number(pp?.total_contracts ?? 0),
    locationMode: (location?.location_mode as LocationMode) ?? "realtime",
    serviceRadius: Number(location?.service_radius_meters ?? 5000),
    fixedAddress: location?.fixed_address ?? "",
    skills,
    tools,
    services,
    serviceSkillsMap,
    serviceToolsMap,
    punctuality,
  };
}

export default function UserProfileScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState<{ title: string; message?: string } | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    fetchProviderData(id)
      .then((data) => setProvider(data))
      .catch((err) => console.warn("[user-profile] fetch error:", err))
      .finally(() => setIsLoading(false));
  }, [id]);

  function handleVerifiedPress(type: VerificationType, context?: "service") {
    const baseMessage = type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
      : type === "community" ? "Verificado por avaliações da comunidade de usuários."
      : "Verificação em análise pela equipe Krono.";
    const message = context === "service"
      ? type === "documentation" ? "Serviço verificado por documentação e histórico de contratos na plataforma Krono."
        : type === "community" ? "Serviço verificado pela comunidade com base em avaliações e contratos."
        : "Verificação do serviço em análise pela equipe Krono."
      : baseMessage;
    setDialog({ title: VERIFICATION_LABELS[type], message });
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#e06030" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
        <BackButton />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Perfil não encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.screenLabel, { color: colors.textMuted }]}>perfil</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{provider.initials}</Text>
            </View>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{provider.name}</Text>
          {provider.since ? (
            <Text style={[styles.sinceTxt, { color: colors.textDim }]}>membro desde {provider.since}</Text>
          ) : null}
          <View style={[styles.statsRow, { borderTopColor: colors.surface }]}>
            {[
              { val: String(provider.totalContracts), label: "contratos" },
              { val: String(provider.services.length), label: "services" },
            ].map((item, i, arr) => (
              <React.Fragment key={item.label}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.val}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{item.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.surface }]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <PunctualidadeCard stats={provider.punctuality} colors={colors} />

        {(provider.locationMode || provider.serviceRadius > 0) && (
          <ServiceAreaCard
            locationMode={provider.locationMode}
            serviceRadius={provider.serviceRadius}
            fixedAddress={provider.fixedAddress}
            colors={colors}
          />
        )}

        {provider.services.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>services</Text>
            <View style={{ gap: 10, marginBottom: 24 }}>
              {provider.services.map((service) => {
                const serviceSkills: Skill[] = provider.serviceSkillsMap[service.id] ?? [];
                const serviceTools: Tool[] = provider.serviceToolsMap[service.id] ?? [];
                return (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    skills={serviceSkills}
                    tools={serviceTools}
                    active={service.active}
                    colors={colors}
                    onPress={() => router.push(`/provider-service/${service.id}?profileId=${provider.id}` as any)}
                    onVerifiedPress={handleVerifiedPress}
                  />
                );
              })}
            </View>
          </>
        )}

        {provider.skills.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>skills</Text>
            <View style={{ gap: 10, marginBottom: 24 }}>
              {provider.skills.map((skill) => (
                <View key={skill.id} style={[styles.skillCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.skillHeader}>
                    <View style={styles.skillIconWrap}>
                      <Feather name="star" size={13} color="#e06030" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.skillNameRow}>
                        <Text style={styles.skillName}>{skill.name}</Text>
                        {skill.verified && (
                          <VerifiedBadge onPress={() => skill.verified && handleVerifiedPress(skill.verified.type)} />
                        )}
                      </View>
                      {skill.type ? (
                        <Text style={[styles.skillType, { color: colors.textMuted }]}>{skill.type}</Text>
                      ) : null}
                      {skill.description ? (
                        <Text style={[styles.skillDesc, { color: colors.textSecondary }]}>{skill.description}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {provider.tools.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>tools</Text>
            <View style={{ gap: 10, marginBottom: 40 }}>
              {provider.tools.map((tool) => (
                <View key={tool.id} style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.toolIconWrap}>
                    <Feather name={tool.icon === "truck" ? "truck" : tool.icon === "tool" ? "tool" : "box"} size={14} color="#18a06b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.toolNameRow}>
                      <Text style={styles.toolName}>{tool.name}</Text>
                      {tool.verified && (
                        <VerifiedBadge onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)} />
                      )}
                    </View>
                    <Text style={[styles.toolType, { color: colors.textMuted }]}>{tool.type}</Text>
                    {tool.details ? (
                      <Text style={[styles.toolDetails, { color: colors.textSecondary }]}>{tool.details}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.availDot, { backgroundColor: tool.available ? "#18a06b" : colors.textDim }]} />
                </View>
              ))}
            </View>
          </>
        )}

        {provider.services.length === 0 && provider.skills.length === 0 && provider.tools.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Feather name="user" size={28} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>perfil sem services cadastrados</Text>
          </View>
        )}
      </ScrollView>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} onDismiss={() => setDialog(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  errorText: { fontFamily: "Sora_400Regular", fontSize: 14, marginTop: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
  backBtn: { padding: 4, flexShrink: 0 },
  screenLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  profileCard: { borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 14 },
  avatarWrap: { marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#e0603015", borderWidth: 2, borderColor: "#e0603030", alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Sora_700Bold", fontSize: 24, color: "#e06030" },
  profileName: { fontFamily: "Sora_700Bold", fontSize: 20, marginBottom: 4, textAlign: "center" },
  sinceTxt: { fontFamily: "DMSans_400Regular", fontSize: 11, marginBottom: 8 },
  statsRow: { flexDirection: "row", alignItems: "center", width: "100%", paddingTop: 16, borderTopWidth: 1 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 28 },
  statValue: { fontFamily: "DMSans_500Medium", fontSize: 14 },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  sectionLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  skillCard: { borderWidth: 1, borderRadius: 24, padding: 16 },
  skillHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  skillIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#e0603010", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  skillNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  skillName: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#e06030dd", flex: 1 },
  skillType: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  skillDesc: { fontFamily: "Sora_400Regular", fontSize: 11, lineHeight: 16 },
  newBadge: { backgroundColor: "#1a2a1a", borderWidth: 1, borderColor: "#18a06b30", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  newBadgeText: { fontFamily: "DMSans_400Regular", fontSize: 9, color: "#18a06b" },
  toolCard: { borderWidth: 1, borderRadius: 24, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  toolIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#18a06b10", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  toolNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  toolName: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#18a06bdd", flex: 1 },
  toolType: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  toolDetails: { fontFamily: "Sora_400Regular", fontSize: 11 },
  availDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  emptyState: { borderRadius: 24, padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
});
