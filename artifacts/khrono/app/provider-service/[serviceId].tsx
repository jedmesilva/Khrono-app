import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog } from "@/components/AppDialog";
import { IconButton } from "@/components/IconButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/context/ThemeContext";
import { VERIFICATION_LABELS, VerificationType, type Skill, type Tool } from "@/constants/profile-data";
import { supabase } from "@/lib/supabase";
import { formatMonthYear } from "@/context/ServicesContext";
import { formatRateValue } from "@/lib/format";

// ── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = "#e06030";
const GREEN = "#00e5a0";
const GREEN_SOLID = "#18a06b";
const HERO_HEIGHT = 280;

const DARK_GRADIENTS: [string, string][] = [
  ["#1d1510", "#100e0c"],
  ["#0e1a11", "#100e0c"],
  ["#160f1d", "#100e0c"],
  ["#1a100c", "#100e0c"],
  ["#0d1318", "#100e0c"],
];

const LIGHT_GRADIENTS: [string, string][] = [
  ["#f0e9e3", "#f8f5f2"],
  ["#e6f0e9", "#f8f5f2"],
  ["#ede6f5", "#f8f5f2"],
  ["#f0e9e3", "#f8f5f2"],
  ["#e3ecf0", "#f8f5f2"],
];

function gradientFromId(id: string, isDark: boolean): [string, string] {
  const palette = isDark ? DARK_GRADIENTS : LIGHT_GRADIENTS;
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palette[sum % palette.length];
}

function makeDecorLabel(name: string, skills: Skill[]): string {
  const cat = skills[0]?.type;
  const raw = cat ? cat.split(/\s+/)[0] : name.split(/\s+/)[0];
  return raw.slice(0, 7).toUpperCase();
}

// ── ChipOverflowRow (mesmo padrão do ServiceCard) ───────────────────────────
const CHIP_GAP = 5;
const OVERFLOW_BADGE_W = 42;
type OverflowItem = { id: string; name: string };

function ChipOverflowRow({
  items,
  renderChip,
  overflowBg,
  overflowBorder,
  overflowColor,
}: {
  items: OverflowItem[];
  renderChip: (item: OverflowItem) => React.ReactNode;
  overflowBg: string;
  overflowBorder: string;
  overflowColor: string;
}) {
  const containerW = useRef(0);
  const chipW = useRef<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  function compute() {
    const cw = containerW.current;
    if (cw === 0 || Object.keys(chipW.current).length < items.length) return;
    let used = 0;
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      const w = chipW.current[items[i].id] ?? 0;
      const spacing = count > 0 ? CHIP_GAP : 0;
      const isLast = i === items.length - 1;
      if (isLast) {
        if (used + spacing + w <= cw) count++;
      } else {
        if (used + spacing + w + CHIP_GAP + OVERFLOW_BADGE_W <= cw) {
          used += spacing + w;
          count++;
        } else {
          break;
        }
      }
    }
    setVisibleCount(count);
  }

  const overflow = visibleCount !== null ? items.length - visibleCount : 0;

  return (
    <View
      style={chipStyles.row}
      onLayout={(e) => {
        containerW.current = e.nativeEvent.layout.width;
        compute();
      }}
    >
      {visibleCount === null &&
        items.map((item) => (
          <View
            key={`m_${item.id}`}
            style={chipStyles.measure}
            onLayout={(e) => {
              chipW.current[item.id] = e.nativeEvent.layout.width;
              compute();
            }}
          >
            {renderChip(item)}
          </View>
        ))}
      {visibleCount !== null &&
        items.slice(0, visibleCount).map((item) => (
          <React.Fragment key={item.id}>{renderChip(item)}</React.Fragment>
        ))}
      {overflow > 0 && (
        <View style={[chipStyles.overflow, { backgroundColor: overflowBg, borderColor: overflowBorder }]}>
          <Text style={[chipStyles.overflowText, { color: overflowColor }]}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "nowrap", gap: CHIP_GAP },
  measure: { opacity: 0, position: "absolute" },
  overflow: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, alignItems: "center", justifyContent: "center", minWidth: OVERFLOW_BADGE_W },
  overflowText: { fontFamily: "DMSans_600SemiBold", fontSize: 11 },
});

// ── StarRow ──────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={size} color={ACCENT} style={{ opacity: s <= rating ? 1 : 0.2 }} />
      ))}
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ── Types ────────────────────────────────────────────────────────────────────
type ExpandedCard = "rating" | "reviews" | "contracts" | null;

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

// ── Data fetching ────────────────────────────────────────────────────────────
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

// ── Screen ───────────────────────────────────────────────────────────────────
export default function ProviderServiceScreen() {
  const { colors, isDark } = useTheme();
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
    const baseMessage = type === "documentation"
      ? "Identidade e documentação verificadas pela equipe Krono."
      : type === "community"
      ? "Verificado por avaliações da comunidade de usuários."
      : "Verificação em análise pela equipe Krono.";
    const message = context === "service"
      ? type === "documentation"
        ? "Serviço verificado por documentação e histórico de contratos na plataforma Krono."
        : type === "community"
        ? "Serviço verificado pela comunidade com base em avaliações e contratos."
        : "Verificação do serviço em análise pela equipe Krono."
      : baseMessage;
    setDialog({ title: VERIFICATION_LABELS[type], message });
  }

  function toggleCard(card: ExpandedCard) {
    setExpanded((prev) => (prev === card ? null : card));
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.iconBack} />
        </Pressable>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Serviço não encontrado.</Text>
      </View>
    );
  }

  const { service, provider } = data;

  // ── Gradient & decor ───────────────────────────────────────────────────────
  const [gradStart, gradEnd] = gradientFromId(service.id, isDark);
  const decorText = makeDecorLabel(service.name, service.skills);
  const gridOpacity = isDark ? 0.07 : 0.05;
  const decorOpacity = isDark ? 0.09 : 0.06;
  const accentBg = isDark ? "rgba(224,96,48,0.09)" : "rgba(224,96,48,0.07)";
  const accentBorder = isDark ? "rgba(224,96,48,0.24)" : "rgba(224,96,48,0.20)";
  const greenBg = isDark ? "rgba(24,160,107,0.09)" : "rgba(24,160,107,0.07)";
  const greenBorder = isDark ? "rgba(24,160,107,0.24)" : "rgba(24,160,107,0.20)";
  const heroFadeColor = isDark ? "#0e0d0b" : (gradStart === "#f0e9e3" ? "#f8f5f2" : "#f8f5f2");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Scrollable body (hero + conteúdo) ───────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { height: HERO_HEIGHT + topPadding }]}
      >
        {/* Grid decoration */}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 390 340" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="340" stroke={ACCENT} strokeWidth="1" opacity={gridOpacity} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Line key={`h${i}`} x1="0" y1={i * 56} x2="390" y2={i * 56} stroke={ACCENT} strokeWidth="1" opacity={gridOpacity} />
          ))}
        </Svg>

        {/* Decorative text */}
        <Text style={[styles.decorLabel, { color: ACCENT, opacity: decorOpacity, bottom: 52 }]} numberOfLines={1}>
          {decorText}
        </Text>

        {/* Back button */}
        <IconButton
          icon="arrow-left"
          onPress={() => router.back()}
          style={{ position: "absolute", top: topPadding + 12, left: 14, zIndex: 10 }}
        />

        {/* Status badge */}
        <View style={[styles.statusBadge, { top: topPadding + 16 }]}>
          <View style={[styles.statusDot, { backgroundColor: GREEN }]} />
          <Text style={[styles.statusText, { color: GREEN }]}>ativo</Text>
        </View>

        {/* Verified badge top-right (if any) */}
        {service.verified && (
          <IconButton
            icon="check-circle"
            iconSize={13}
            color={GREEN}
            onPress={() => service.verified && handleVerifiedPress(service.verified.type, "service")}
            style={{ position: "absolute", top: topPadding + 56, right: 14, zIndex: 10 }}
          />
        )}

        {/* Bottom gradient fade */}
        <LinearGradient
          colors={["transparent", heroFadeColor]}
          style={styles.heroFade}
          pointerEvents="none"
        />

        {/* Hero content: name + price */}
        <View style={styles.heroContent}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={[styles.heroTitle, { color: isDark ? "rgba(255,255,255,0.90)" : "#1a1a1a" }]} numberOfLines={2}>
              {service.name}
            </Text>
          </View>
          <View style={styles.heroPriceBlock}>
            <Text style={[styles.heroPrice, { color: ACCENT }]}>{formatRateValue(service.hourlyRate)}</Text>
            <Text style={[styles.heroPerHour, { color: isDark ? "rgba(255,255,255,0.40)" : "#888" }]}>/hora</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Meta row: rating + avaliacoes + contratos */}
        <View style={styles.metaRow}>
          {service.nota > 0 && (
            <>
              <StarRow rating={Math.round(service.nota)} size={12} />
              <Text style={[styles.metaValue, { color: colors.textMuted }]}>{service.nota.toFixed(1)}</Text>
              <Text style={[styles.metaDot, { color: colors.textDim }]}>·</Text>
            </>
          )}
          <Feather name="file-text" size={12} color={colors.textDim} />
          <Text style={[styles.metaValue, { color: colors.textMuted }]}>
            {service.avaliacoes} avaliações
          </Text>
          <Text style={[styles.metaDot, { color: colors.textDim }]}>·</Text>
          <Text style={[styles.metaValue, { color: colors.textMuted }]}>
            {service.contracts} contratos
          </Text>
        </View>

        {/* Provider mini card */}
        <Pressable
          style={[styles.providerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => router.push(`/user-profile/${provider.id}` as any)}
        >
          <View style={styles.providerAvatar}>
            <Text style={styles.providerAvatarText}>{provider.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.providerName, { color: colors.text }]}>{provider.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Feather name="star" size={9} color={ACCENT} />
              <Text style={[styles.providerMeta, { color: colors.textSecondary }]}>
                {provider.nota > 0 ? provider.nota.toFixed(1) : "—"} · {provider.avaliacoes} avaliações
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={14} color={colors.chevron} />
        </Pressable>

        {/* Skills card */}
        {service.skills.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                <Feather name="star" size={13} color={ACCENT} />
              </View>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Skills</Text>
            </View>
            <ChipOverflowRow
              key={service.skills.map((s) => s.id).join()}
              items={service.skills}
              overflowBg={accentBg}
              overflowBorder={accentBorder}
              overflowColor={ACCENT}
              renderChip={(sk) => (
                <View style={[styles.chipAccent, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                  <Text style={[styles.chipAccentText, { color: ACCENT }]} numberOfLines={1}>{sk.name}</Text>
                </View>
              )}
            />
          </View>
        )}

        {/* Tools card */}
        {service.tools.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: greenBg, borderColor: greenBorder }]}>
                <Feather name="key" size={13} color={GREEN_SOLID} />
              </View>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Tools</Text>
            </View>
            <ChipOverflowRow
              key={service.tools.map((t) => t.id).join()}
              items={service.tools}
              overflowBg={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}
              overflowBorder={colors.surfaceBorder}
              overflowColor={colors.textMuted}
              renderChip={(t) => (
                <View style={[styles.chipNeutral, { borderColor: colors.surfaceBorder }]}>
                  <Text style={[styles.chipNeutralText, { color: colors.textMuted }]} numberOfLines={1}>{t.name}</Text>
                </View>
              )}
            />
          </View>
        )}

        {/* Performance grid */}
        {!service.isNew ? (
          <View style={styles.perfGrid}>
            {([
              { key: "rating" as const, value: service.nota.toFixed(1), label: "NOTA" },
              { key: "reviews" as const, value: String(service.avaliacoes), label: "AVALIAÇÕES" },
              { key: "contracts" as const, value: String(service.contracts), label: "CONTRATOS" },
            ]).map((item) => (
              <Pressable
                key={item.key}
                style={[styles.perfCard, { backgroundColor: colors.card, borderColor: expanded === item.key ? colors.surfaceBorder : colors.cardBorder }]}
                onPress={() => toggleCard(item.key)}
              >
                <View style={styles.perfCardHeader}>
                  <Text style={[styles.perfCardValue, { color: colors.text }]}>{item.value}</Text>
                  <Feather name={expanded === item.key ? "chevron-up" : "chevron-down"} size={12} color={colors.textMuted} />
                </View>
                <Text style={[styles.perfCardLabel, { color: colors.textMuted }]}>{item.label}</Text>
                {expanded === item.key && (
                  <View style={[styles.perfExpanded, { borderTopColor: colors.surface }]}>
                    {item.key === "rating" ? (
                      <View style={{ gap: 8, alignItems: "flex-start" }}>
                        <StarRow rating={Math.round(service.nota)} size={14} />
                        <Text style={[styles.perfExpandedText, { color: colors.textSecondary }]}>
                          Baseado em {service.avaliacoes} avaliações
                        </Text>
                      </View>
                    ) : (
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
            <Text style={[styles.emptyPerfText, { color: colors.textDim }]}>serviço novo · sem atividade ainda</Text>
            <Text style={[styles.emptyPerfSub, { color: colors.textMuted }]}>os dados aparecerão após o primeiro contrato</Text>
          </View>
        )}
      </View>
      </ScrollView>

      {/* ── CTA fixo no rodapé ───────────────────────────────────────── */}
      <View style={[styles.ctaBar, { backgroundColor: colors.background, borderTopColor: colors.cardBorder, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => router.push(`/user-profile/${provider.id}` as any)}
        >
          <Text style={styles.ctaBtnText}>Contratar serviço</Text>
        </TouchableOpacity>
      </View>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} onDismiss={() => setDialog(null)} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Sora_400Regular", fontSize: 14, marginTop: 20, paddingHorizontal: 20 },
  backBtn: { padding: 4, position: "absolute", top: 20, left: 20 },

  // Hero
  hero: { width: "100%", overflow: "hidden", position: "relative" },
  statusBadge: {
    position: "absolute",
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(0,229,160,0.30)",
    backgroundColor: "rgba(0,229,160,0.12)",
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase" },
  decorLabel: {
    position: "absolute",
    right: -8,
    fontFamily: "Sora_700Bold",
    fontSize: 110,
    letterSpacing: -4,
    lineHeight: 116,
    includeFontPadding: false,
  },
  heroFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  heroTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  heroPriceBlock: { flexShrink: 0, alignItems: "flex-end" },
  heroPrice: { fontFamily: "Sora_700Bold", fontSize: 28, lineHeight: 30, letterSpacing: 0.2 },
  heroPerHour: { fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2, textAlign: "right" },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  metaValue: { fontFamily: "DMMono_400Regular", fontSize: 11 },
  metaDot: { fontFamily: "DMMono_400Regular", fontSize: 11, marginHorizontal: 1 },

  // Provider card
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  providerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(224,96,48,0.12)",
    borderWidth: 1,
    borderColor: "rgba(224,96,48,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  providerAvatarText: { fontFamily: "Sora_700Bold", fontSize: 13, color: ACCENT },
  providerName: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  providerMeta: { fontFamily: "DMSans_400Regular", fontSize: 10 },

  // Section cards (skills / tools)
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase" },

  // Chips
  chipAccent: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 180 },
  chipAccentText: { fontFamily: "DMSans_600SemiBold", fontSize: 11 },
  chipNeutral: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 180 },
  chipNeutralText: { fontFamily: "DMSans_400Regular", fontSize: 11 },

  // Performance grid
  perfGrid: { flexDirection: "row", gap: 8 },
  perfCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14 },
  perfCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  perfCardValue: { fontFamily: "DMSans_500Medium", fontSize: 22 },
  perfCardLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" },
  perfExpanded: { marginTop: 12, borderTopWidth: 1, paddingTop: 12 },
  perfExpandedText: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  emptyPerf: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyPerfText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  emptyPerfSub: { fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 17 },

  // CTA bar
  ctaBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: {
    fontFamily: "Sora_700Bold",
    fontSize: 15,
    color: "#fff",
    letterSpacing: -0.2,
  },
});
