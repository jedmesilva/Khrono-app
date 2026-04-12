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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog } from "@/components/AppDialog";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/context/ThemeContext";
import { VERIFICATION_LABELS, VerificationType, type Skill, type Tool } from "@/constants/profile-data";
import { supabase } from "@/lib/supabase";
import { formatMonthYear } from "@/context/ServicesContext";

type ExpandedCard = "rating" | "reviews" | "contracts" | null;

function StarRow({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={size} color="#e06030" style={{ opacity: s <= rating ? 1 : 0.2 }} />
      ))}
    </View>
  );
}

function getInitials(name: string): string {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

type ServiceData = {
  id: string;
  name: string;
  hourlyRate: number;
  nota: number;
  avaliacoes: number;
  contracts: number;
  isNew: boolean;
  verified: { type: VerificationType } | null;
  skills: Skill[];
  tools: Tool[];
};

type ProviderMini = {
  id: string;
  name: string;
  initials: string;
  nota: number;
  avaliacoes: number;
};

async function fetchServiceData(serviceId: string, profileId: string): Promise<{ service: ServiceData; provider: ProviderMini } | null> {
  const [serviceRes, profileRes, ppRes, contractsRes] = await Promise.all([
    supabase.from("provider_services")
      .select(`id, nome, valor_hora, nota, avaliacoes, is_active, created_at, service_skills(skill_id, skill:skills_catalog(id, nome, category, description, verified)), service_tools(tool_id, tool:provider_tools(id, nome, tipo, details, is_available, created_at))`)
      .eq("id", serviceId)
      .single(),
    supabase.from("profiles").select("id, name, first_name").eq("id", profileId).single(),
    supabase.from("provider_profiles").select("nota, avaliacoes").eq("profile_id", profileId).single(),
    supabase.from("contracts").select("id").eq("service_id", serviceId),
  ]);

  if (!serviceRes.data) return null;

  const row = serviceRes.data as any;
  const profile = profileRes.data;
  const pp = ppRes.data;

  const skills: Skill[] = (row.service_skills ?? []).map((ss: any) => {
    const cs = ss.skill as any;
    return {
      id: cs?.id ?? ss.skill_id,
      name: cs?.nome ?? "",
      type: cs?.category ?? "",
      description: cs?.description ?? "",
      verified: cs?.verified ? ({ type: "documentation" as VerificationType }) : null,
      isNew: false,
      addedAt: "",
    };
  });

  const tools: Tool[] = (row.service_tools ?? []).map((st: any) => {
    const t = st.tool as any;
    const tipo = t?.tipo ?? "equipamento";
    const tipoNorm = tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const icon: "truck" | "tool" | "box" = tipoNorm === "veiculo" ? "truck" : tipoNorm === "ferramenta" ? "tool" : "box";
    return {
      id: t?.id ?? st.tool_id,
      name: t?.nome ?? "",
      type: tipo,
      icon,
      details: t?.details ?? "",
      available: Boolean(t?.is_available),
      verified: null,
      addedAt: formatMonthYear(t?.created_at),
    };
  });

  const contractsCount = contractsRes.data?.length ?? 0;

  const service: ServiceData = {
    id: row.id,
    name: row.nome,
    hourlyRate: Number(row.valor_hora ?? 50),
    nota: Number(row.nota ?? 0),
    avaliacoes: Number(row.avaliacoes ?? 0),
    contracts: contractsCount,
    isNew: contractsCount < 10,
    verified: null,
    skills,
    tools,
  };

  const providerName = profile?.name ?? profile?.first_name ?? "Prestador";
  const provider: ProviderMini = {
    id: profileId,
    name: providerName,
    initials: getInitials(providerName),
    nota: Number(pp?.nota ?? 0),
    avaliacoes: Number(pp?.avaliacoes ?? 0),
  };

  return { service, provider };
}

export default function ProviderServiceScreen() {
  const { colors } = useTheme();
  const { serviceId, profileId } = useLocalSearchParams<{ serviceId: string; profileId: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [data, setData] = useState<{ service: ServiceData; provider: ProviderMini } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<ExpandedCard>(null);
  const [dialog, setDialog] = useState<{ title: string; message?: string } | null>(null);

  useEffect(() => {
    if (!serviceId || !profileId) { setIsLoading(false); return; }
    fetchServiceData(serviceId, profileId)
      .then((result) => setData(result))
      .catch((err) => console.warn("[provider-service] fetch error:", err))
      .finally(() => setIsLoading(false));
  }, [serviceId, profileId]);

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

  function toggleCard(card: ExpandedCard) { setExpanded((prev) => (prev === card ? null : card)); }

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#e06030" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#e06030" />
        </Pressable>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Service não encontrado.</Text>
      </View>
    );
  }

  const { service, provider } = data;

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#e06030" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[styles.serviceTitle, { color: colors.text }]}>{service.name}</Text>
              {service.verified && (
                <VerifiedBadge onPress={() => service.verified && handleVerifiedPress(service.verified.type, "service")} />
              )}
            </View>
            <Text style={styles.serviceRate}>R${service.hourlyRate}/h</Text>
          </View>
        </View>

        <Pressable
          style={[styles.providerMini, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push(`/user-profile/${provider.id}` as any)}
        >
          <View style={styles.providerMiniAvatar}>
            <Text style={styles.providerMiniAvatarText}>{provider.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.providerMiniName, { color: colors.text }]}>{provider.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Feather name="star" size={9} color="#e06030" />
              <Text style={[styles.providerMiniMeta, { color: colors.textSecondary }]}>
                {provider.nota > 0 ? provider.nota.toFixed(1) : "—"} · {provider.avaliacoes} avaliações
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={13} color={colors.chevron} />
        </Pressable>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>COMPOSIÇÃO</Text>

          {service.skills.length > 0 && (
            <View style={styles.compositionRow}>
              <View style={[styles.compIcon, { borderColor: "#e0603025", backgroundColor: "#e0603010" }]}>
                <Feather name="star" size={13} color="#e06030" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.compLabel, { color: colors.textMuted }]}>Skills</Text>
                {service.skills.map((sk) => (
                  <View key={sk.id}>
                    <View style={styles.compNameRow}>
                      <Text style={styles.compSkillName}>{sk.name}</Text>
                      {sk.verified && (
                        <VerifiedBadge onPress={() => sk.verified && handleVerifiedPress(sk.verified.type)} />
                      )}
                    </View>
                    {sk.description ? (
                      <Text style={[styles.skillDesc, { color: colors.textSecondary }]}>{sk.description}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {service.tools.length > 0 ? (
            <View style={[styles.compositionRow, { marginTop: 12 }]}>
              <View style={[styles.compIcon, { borderColor: "#18a06b25", backgroundColor: "#18a06b10" }]}>
                <Feather name="key" size={13} color="#18a06b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.compLabel, { color: colors.textMuted }]}>Tools</Text>
                <View style={{ gap: 6, marginTop: 2 }}>
                  {service.tools.map((tool) => (
                    <View key={tool.id}>
                      <View style={styles.compNameRow}>
                        <Text style={styles.compToolName}>{tool.name}</Text>
                        {tool.verified && (
                          <VerifiedBadge onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)} />
                        )}
                      </View>
                      {tool.details ? (
                        <Text style={[styles.toolDetails, { color: colors.textDim }]}>{tool.details}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
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

        {!service.isNew ? (
          <View style={styles.performanceGrid}>
            {([
              { key: "rating" as const, value: service.nota.toFixed(1), label: "NOTA" },
              { key: "reviews" as const, value: String(service.avaliacoes), label: "AVALIAÇÕES" },
              { key: "contracts" as const, value: String(service.contracts), label: "CONTRATOS" },
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
                  <View style={[styles.perfExpanded, { borderTopColor: colors.surface }]}>
                    {item.key === "rating" && (
                      <View style={{ gap: 8, alignItems: "flex-start" }}>
                        <StarRow rating={Math.round(service.nota)} size={14} />
                        <Text style={[styles.perfExpandedText, { color: colors.textSecondary }]}>
                          Baseado em {service.avaliacoes} avaliações
                        </Text>
                      </View>
                    )}
                    {item.key !== "rating" && (
                      <Text style={[styles.perfExpandedText, { color: colors.textSecondary }]}>
                        {item.value} {item.label.toLowerCase()}
                      </Text>
                    )}
                  </View>
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
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  backBtn: { padding: 4, marginTop: 2, flexShrink: 0 },
  serviceTitle: { fontFamily: "Sora_700Bold", fontSize: 20, marginBottom: 4, flex: 1 },
  serviceRate: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "#e06030" },
  errorText: { fontFamily: "Sora_400Regular", fontSize: 14, marginTop: 20, paddingHorizontal: 20 },
  providerMini: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  providerMiniAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e0603015", borderWidth: 1, borderColor: "#e0603030", alignItems: "center", justifyContent: "center" },
  providerMiniAvatarText: { fontFamily: "Sora_700Bold", fontSize: 12, color: "#e06030" },
  providerMiniName: { fontFamily: "Sora_600SemiBold", fontSize: 13, marginBottom: 2 },
  providerMiniMeta: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  card: { borderWidth: 1, borderRadius: 24, padding: 18, marginBottom: 16 },
  cardLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 },
  compositionRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  compIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  compLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  compNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  compSkillName: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#e06030dd", flex: 1 },
  compToolName: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#18a06bdd", flex: 1 },
  compEmptyText: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  skillDesc: { fontFamily: "Sora_400Regular", fontSize: 11, lineHeight: 16, marginTop: 2 },
  toolDetails: { fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 1 },
  performanceGrid: { gap: 10, marginBottom: 16 },
  perfCard: { borderWidth: 1, borderRadius: 24, padding: 16 },
  perfCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  perfCardValue: { fontFamily: "DMSans_500Medium", fontSize: 26 },
  perfCardLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" },
  perfExpanded: { marginTop: 16, borderTopWidth: 1, paddingTop: 14 },
  perfExpandedText: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  emptyPerf: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyPerfText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  emptyPerfSub: { fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 17 },
});
