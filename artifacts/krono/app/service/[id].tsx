import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
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

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { BackButton } from "@/components/BackButton";
import { SimpleIconButton } from "@/components/SimpleIconButton";
import { VerifiedBadge, VerifiedIcon } from "@/components/VerifiedBadge";
import { useServices } from "@/context/ServicesContext";
import { useCatalog } from "@/context/CatalogContext";
import { useTheme } from "@/context/ThemeContext";
import { Skill, VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";
import { SKILL_ICON, TOOL_SECTION_ICON } from "@/constants/catalog-icons";
import { formatRateValue } from "@/lib/format";

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = "#e06030";
const GREEN_BADGE = "#00e5a0";
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

// ── ChipOverflowRow ───────────────────────────────────────────────────────────
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
      onLayout={(e) => { containerW.current = e.nativeEvent.layout.width; compute(); }}
    >
      {visibleCount === null && items.map((item) => (
        <View
          key={`m_${item.id}`}
          style={chipStyles.measure}
          onLayout={(e) => { chipW.current[item.id] = e.nativeEvent.layout.width; compute(); }}
        >
          {renderChip(item)}
        </View>
      ))}
      {visibleCount !== null && items.slice(0, visibleCount).map((item) => (
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

// ── StarRow ───────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={size} color={ACCENT} style={{ opacity: s <= rating ? 1 : 0.2 }} />
      ))}
    </View>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type ExpandedCard = "rating" | "reviews" | "contracts" | null;
type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ServiceDetailScreen() {
  const { colors, isDark } = useTheme();
  const { isActive, toggleActive, myServices, myTools, isLoading } = useServices();
  const { skills: catalogSkills } = useCatalog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [expanded, setExpanded] = useState<ExpandedCard>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  const service = myServices.find((s) => s.id === id);

  if (!service) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <View style={{ position: "absolute", top: topPadding + 16, left: 16 }}>
          <BackButton />
        </View>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Serviço não encontrado.</Text>
      </View>
    );
  }

  const active = isActive(service.id);

  const skills: Skill[] = service.skillIds
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

  const tools = myTools.filter((t) => service.toolIds.includes(t.id));

  // ── Gradient & decor ───────────────────────────────────────────────────────
  const [gradStart, gradEnd] = gradientFromId(service.id, isDark);
  const decorText = makeDecorLabel(service.name, skills);
  const gridOpacity = isDark ? 0.07 : 0.05;
  const decorOpacity = (isDark ? 0.09 : 0.06) * (active ? 1 : 0.4);
  const accentBg = isDark ? "rgba(224,96,48,0.09)" : "rgba(224,96,48,0.07)";
  const accentBorder = isDark ? "rgba(224,96,48,0.24)" : "rgba(224,96,48,0.20)";
  const heroFadeColor = isDark ? "#0e0d0b" : "#f8f5f2";

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleVerifiedPress(type: VerificationType, context?: "service") {
    const message = context === "service"
      ? type === "documentation" ? "Serviço verificado por documentação e histórico de contratos na plataforma Krono."
        : type === "community" ? "Serviço verificado pela comunidade com base em avaliações e contratos."
        : "Verificação do serviço em análise pela equipe Krono."
      : type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
        : type === "community" ? "Verificado por avaliações da comunidade de usuários."
        : "Verificação em análise pela equipe Krono.";
    setDialog({ title: VERIFICATION_LABELS[type], message });
  }

  function handleMoreOptions() {
    setDialog({
      title: service!.name,
      buttons: [
        {
          label: "Editar serviço",
          onPress: () => { setDialog(null); router.push("/cadastro-service"); },
        },
        {
          label: "Excluir serviço",
          style: "destructive",
          onPress: () => {
            setDialog({
              title: "Excluir serviço?",
              message: `"${service!.name}" será removido do seu perfil permanentemente.`,
              buttons: [
                { label: "Cancelar", onPress: () => setDialog(null) },
                {
                  label: "Excluir",
                  style: "destructive",
                  onPress: () => { setDialog(null); router.back(); },
                },
              ],
            });
          },
        },
        { label: "Cancelar", onPress: () => setDialog(null) },
      ],
    });
  }

  function toggleCard(card: ExpandedCard) {
    setExpanded((prev) => (prev === card ? null : card));
  }

  const firstSkill = skills[0] ?? null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Fixed transparent header ─────────────────────────────────── */}
      <View style={[styles.fixedHeader, { top: topPadding }]} pointerEvents="box-none">
        <BackButton />
        <View style={{ flex: 1 }} pointerEvents="none" />
        <SimpleIconButton icon="more-horizontal" size={18} onPress={handleMoreOptions} />
      </View>

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
        style={[styles.hero, { height: HERO_HEIGHT + topPadding, opacity: active ? 1 : 0.7 }]}
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

        {/* Status badge */}
        <View style={[
          styles.statusBadge,
          { top: topPadding + 60 },
          active
            ? { borderColor: "rgba(0,229,160,0.30)", backgroundColor: "rgba(0,229,160,0.12)" }
            : { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)", backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
        ]}>
          <View style={[styles.statusDot, { backgroundColor: active ? GREEN_BADGE : (isDark ? "#504840" : "#bbb") }]} />
          <Text style={[styles.statusText, { color: active ? GREEN_BADGE : (isDark ? "#706860" : "#999") }]}>
            {active ? "ativo" : "inativo"}
          </Text>
        </View>

        {/* Verified badge */}
        {service.verified && (
          <Pressable
            style={[styles.heroBtn, { top: topPadding + 56, right: 56, backgroundColor: isDark ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.50)", borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)" }]}
            onPress={() => service.verified && handleVerifiedPress(service.verified.type, "service")}
            hitSlop={10}
          >
            <VerifiedIcon size={13} color={GREEN_BADGE} />
          </Pressable>
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
            <Text style={[styles.heroTitle, { color: isDark ? "rgba(255,255,255,0.90)" : "#1a1a1a", opacity: active ? 1 : 0.6 }]} numberOfLines={2}>
              {service.name}
            </Text>
          </View>
          <View style={styles.heroPriceBlock}>
            <Text style={[styles.heroPrice, { color: active ? ACCENT : (isDark ? "#504840" : "#bbb") }]}>
              {formatRateValue(service.hourlyRate)}
            </Text>
            <Text style={[styles.heroPerHour, { color: isDark ? "rgba(255,255,255,0.40)" : "#888" }]}>/hora</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Meta: categoria + data de adição */}
        <View style={styles.metaRow}>
          {firstSkill?.type && (
            <View style={[styles.categoryTag, { backgroundColor: accentBg }]}>
              <Text style={[styles.categoryTagText, { color: ACCENT }]}>{firstSkill.type}</Text>
            </View>
          )}
          {service.addedAt ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Feather name="calendar" size={10} color={colors.textDim} />
              <Text style={[styles.metaDate, { color: colors.textMuted }]}>{service.addedAt}</Text>
            </View>
          ) : null}
        </View>

        {/* Skills card */}
        {skills.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: accentBg }]}>
                <Feather name={SKILL_ICON} size={13} color={ACCENT} />
              </View>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Skills</Text>
            </View>
            <ChipOverflowRow
              key={skills.map((s) => s.id).join()}
              items={skills}
              overflowBg={accentBg}
              overflowBorder={accentBorder}
              overflowColor={ACCENT}
              renderChip={(sk) => (
                <View style={[styles.chipAccent, { backgroundColor: accentBg }]}>
                  <Text style={[styles.chipText, { color: ACCENT }]} numberOfLines={1}>{sk.name}</Text>
                </View>
              )}
            />
          </View>
        ) : (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: colors.surface }]}>
                <Feather name={SKILL_ICON} size={13} color={colors.textDim} />
              </View>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Skills</Text>
            </View>
            <Text style={[styles.emptyChipText, { color: colors.textDim }]}>sem skill vinculada</Text>
          </View>
        )}

        {/* Tools card */}
        {tools.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: accentBg }]}>
                <Feather name={TOOL_SECTION_ICON} size={13} color={ACCENT} />
              </View>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Tools</Text>
            </View>
            <ChipOverflowRow
              key={tools.map((t) => t.id).join()}
              items={tools}
              overflowBg={accentBg}
              overflowBorder={accentBorder}
              overflowColor={ACCENT}
              renderChip={(t) => (
                <View style={[styles.chipAccent, { backgroundColor: accentBg }]}>
                  <Text style={[styles.chipText, { color: ACCENT }]} numberOfLines={1}>{t.name}</Text>
                </View>
              )}
            />
          </View>
        ) : (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBadge, { backgroundColor: colors.surface }]}>
                <Feather name={TOOL_SECTION_ICON} size={13} color={colors.textDim} />
              </View>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Tools</Text>
            </View>
            <Text style={[styles.emptyChipText, { color: colors.textDim }]}>sem tools vinculadas</Text>
          </View>
        )}

        {/* Performance grid */}
        {!service.isNew ? (
          <View style={styles.perfGrid}>
            {([
              {
                key: "rating" as const,
                value: service.rating.toFixed(1),
                label: "NOTA",
                expandContent: (
                  <View style={{ gap: 8, alignItems: "flex-start" }}>
                    <StarRow rating={Math.round(service.rating)} size={14} />
                    <Text style={[styles.perfExpandedText, { color: colors.textSecondary }]}>
                      Baseado em {service.reviews} avaliações
                    </Text>
                  </View>
                ),
              },
              {
                key: "reviews" as const,
                value: String(service.reviews),
                label: "AVALIAÇÕES",
                expandContent: (
                  <View>
                    {service.reviewsList.length === 0 ? (
                      <Text style={[styles.perfExpandedText, { color: colors.textDim }]}>sem avaliações ainda</Text>
                    ) : service.reviewsList.map((r, i) => (
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
                ),
              },
              {
                key: "contracts" as const,
                value: String(service.contracts),
                label: "CONTRATOS",
                expandContent: (
                  <View>
                    {service.contractsList.length === 0 ? (
                      <Text style={[styles.perfExpandedText, { color: colors.textDim }]}>sem contratos registrados</Text>
                    ) : service.contractsList.map((c, i) => (
                      <View key={i} style={[styles.contractItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.surface }]}>
                        <View style={styles.contractRow}>
                          <Text style={[styles.contractClient, { color: colors.text }]}>{c.client}</Text>
                          <Text style={[styles.contractValue, { color: GREEN_SOLID }]}>{c.value}</Text>
                        </View>
                        <Text style={[styles.contractMeta, { color: colors.textMuted }]}>{c.date} · {c.duration}</Text>
                      </View>
                    ))}
                  </View>
                ),
              },
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
                    {item.expandContent}
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

      {/* ── Barra de ações fixada no rodapé ──────────────────────────── */}
      <View style={[styles.ctaBar, { backgroundColor: colors.background, borderTopColor: colors.cardBorder, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            active
              ? { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.surfaceBorder }
              : { backgroundColor: "rgba(224,96,48,0.07)", borderWidth: 1, borderColor: "rgba(224,96,48,0.35)" },
          ]}
          activeOpacity={0.80}
          onPress={() => toggleActive(service.id)}
        >
          <Feather
            name={active ? "pause-circle" : "play-circle"}
            size={16}
            color={active ? colors.textMuted : ACCENT}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.ctaBtnText, { color: active ? colors.textMuted : ACCENT }]}>
            {active ? "Desativar serviço" : "Ativar serviço"}
          </Text>
        </TouchableOpacity>
      </View>

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

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  fixedHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 100,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Sora_400Regular", fontSize: 14, marginTop: 20, paddingHorizontal: 20 },

  // Hero
  hero: { width: "100%", overflow: "hidden", position: "relative" },
  heroBtn: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  statusBadge: {
    position: "absolute",
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
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
  heroFade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 120 },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  heroTitle: { fontFamily: "Sora_700Bold", fontSize: 24, letterSpacing: -0.6, lineHeight: 30 },
  heroPriceBlock: { flexShrink: 0, alignItems: "flex-end" },
  heroPrice: { fontFamily: "Sora_700Bold", fontSize: 28, lineHeight: 30, letterSpacing: 0.2 },
  heroPerHour: { fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2, textAlign: "right" },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  categoryTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  categoryTagText: { fontFamily: "DMSans_500Medium", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  metaDate: { fontFamily: "DMMono_400Regular", fontSize: 11 },

  // Section cards
  sectionCard: { borderRadius: 16, padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIconBadge: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase" },
  emptyChipText: { fontFamily: "DMSans_400Regular", fontSize: 11 },

  // Chips
  chipAccent: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 180 },
  chipNeutral: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 180 },
  chipText: { fontFamily: "DMSans_600SemiBold", fontSize: 11 },

  // Performance grid
  perfGrid: { flexDirection: "row", gap: 8 },
  perfCard: { flex: 1, borderRadius: 16, padding: 14 },
  perfCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  perfCardValue: { fontFamily: "DMSans_500Medium", fontSize: 22 },
  perfCardLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" },
  perfExpanded: { marginTop: 12, borderTopWidth: 1, paddingTop: 12 },
  perfExpandedText: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  emptyPerf: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyPerfText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  emptyPerfSub: { fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 17 },

  // Reviews
  reviewItem: { paddingVertical: 12 },
  reviewItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  reviewAuthor: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  reviewText: { fontFamily: "Sora_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 6 },
  reviewDate: { fontFamily: "DMSans_400Regular", fontSize: 10 },

  // Contracts
  contractItem: { paddingVertical: 10 },
  contractRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  contractClient: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  contractValue: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  contractMeta: { fontFamily: "DMSans_400Regular", fontSize: 10 },

  // CTA bar
  ctaBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  ctaBtn: { borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  ctaBtnText: { fontFamily: "DMSans_500Medium", fontSize: 14 },
});
