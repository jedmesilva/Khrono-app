import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/context/ThemeContext";
import { useUserCatalog } from "@/context/UserCatalogContext";
import { useServices, formatMonthYear } from "@/context/ServicesContext";
import { VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";

const ACCENT = "#e06030";
const GREEN = "#18a06b";
const HERO_H = 220;

const DARK_PAIRS: [string, string][] = [
  ["#1d1510", "#100e0c"],
  ["#0e1a11", "#100e0c"],
  ["#160f1d", "#100e0c"],
  ["#1a100c", "#100e0c"],
  ["#0d1318", "#100e0c"],
];
const LIGHT_PAIRS: [string, string][] = [
  ["#f0e9e3", "#f8f5f2"],
  ["#e6f0e9", "#f8f5f2"],
  ["#ede6f5", "#f8f5f2"],
  ["#f0e9e3", "#f8f5f2"],
  ["#e3ecf0", "#f8f5f2"],
];

function pickGradient(id: string, isDark: boolean): [string, string] {
  const pal = isDark ? DARK_PAIRS : LIGHT_PAIRS;
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return pal[n % pal.length];
}

export default function SkillDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userSkills, removeSkill, toggleSkillActive } = useUserCatalog();
  const { myServices } = useServices();
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    buttons?: AppDialogButton[];
  } | null>(null);

  const entry = useMemo(
    () => userSkills.find((s) => s.skill_id === id) ?? null,
    [userSkills, id]
  );

  const [isActive, setIsActive] = useState(() => entry?.isActive ?? true);

  const skill = useMemo(() => {
    if (!entry) return null;
    return {
      id: entry.skill_id,
      entryId: entry.id,
      name: entry.skill?.nome ?? "",
      category: entry.skill?.category ?? "",
      description: entry.skill?.description ?? "",
      verified: entry.skill?.verified
        ? { type: "community" as VerificationType }
        : null,
      addedAt: formatMonthYear(entry.createdAt),
    };
  }, [entry]);

  const servicesUsingSkill = useMemo(
    () => myServices.filter((s) => s.skillIds.includes(id ?? "")),
    [myServices, id]
  );

  const gradient = useMemo(
    () => pickGradient(skill?.id ?? "default", isDark),
    [skill?.id, isDark]
  );

  const decorLabel = (skill?.category || skill?.name || "SKILL")
    .slice(0, 7)
    .toUpperCase();

  async function handleToggleActive(val: boolean) {
    setIsActive(val);
    if (skill) await toggleSkillActive(skill.entryId, val);
  }

  function handleOptions() {
    if (!skill) return;
    setDialog({
      title: skill.name,
      buttons: [
        {
          label: isActive ? "Desativar skill" : "Ativar skill",
          onPress: () => {
            setDialog(null);
            handleToggleActive(!isActive);
          },
        },
        {
          label: "Editar skill",
          onPress: () => {
            setDialog(null);
            router.push("/cadastro-skill");
          },
        },
        {
          label: "Excluir skill",
          style: "destructive",
          onPress: () => {
            setDialog({
              title: "Excluir skill?",
              message: `"${skill.name}" será removida do seu perfil permanentemente.`,
              buttons: [
                { label: "Cancelar", onPress: () => setDialog(null) },
                {
                  label: "Excluir",
                  style: "destructive",
                  onPress: async () => {
                    setDialog(null);
                    await removeSkill(skill.id);
                    router.back();
                  },
                },
              ],
            });
          },
        },
        { label: "Cancelar", onPress: () => setDialog(null) },
      ],
    });
  }

  if (!skill) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top + 20 },
        ]}
      >
        <View style={styles.emptyFull}>
          <Feather name="alert-circle" size={28} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.textDim }]}>
            skill não encontrada
          </Text>
        </View>
      </View>
    );
  }

  const btnBg = isDark ? "rgba(0,0,0,0.32)" : "rgba(255,255,255,0.54)";
  const btnBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const btnIcon = isDark ? "#f0ebe6" : "#1a1714";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { height: HERO_H + insets.top }]}
      >
        <Pressable
          style={[
            styles.heroBtn,
            {
              top: insets.top + 14,
              left: 14,
              backgroundColor: btnBg,
              borderColor: btnBorder,
            },
          ]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={btnIcon} />
        </Pressable>

        <Pressable
          style={[
            styles.heroBtn,
            {
              top: insets.top + 14,
              right: 14,
              backgroundColor: btnBg,
              borderColor: btnBorder,
            },
          ]}
          onPress={handleOptions}
        >
          <Feather name="more-horizontal" size={18} color={btnIcon} />
        </Pressable>

        <Text
          style={[
            styles.decor,
            { color: isDark ? "#ffffff" : "#000000", top: insets.top, pointerEvents: "none" },
          ]}
          numberOfLines={1}
        >
          {decorLabel}
        </Text>

        <LinearGradient
          colors={["transparent", gradient[1]]}
          style={styles.heroFade}
        />

        <View style={styles.heroBottom}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Text
              style={[
                styles.heroTitle,
                { color: isDark ? "#f0ebe6" : "#1a1714", flexShrink: 1 },
              ]}
              numberOfLines={2}
            >
              {skill.name}
            </Text>
            {skill.verified && (
              <VerifiedBadge
                onPress={() =>
                  setDialog({
                    title: VERIFICATION_LABELS[skill.verified!.type],
                    message:
                      "Essa habilidade foi validada por avaliações positivas de quem já contratou esse prestador.",
                  })
                }
              />
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 6,
              marginTop: 6,
              alignItems: "center",
            }}
          >
            {!!skill.category && (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: "rgba(224,96,48,0.14)",
                    borderColor: "rgba(224,96,48,0.28)",
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: ACCENT }]}>
                  {skill.category}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? "rgba(24,160,107,0.14)"
                    : isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.07)",
                  borderColor: isActive
                    ? "rgba(24,160,107,0.32)"
                    : isDark
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(0,0,0,0.14)",
                },
              ]}
            >
              {isActive && (
                <View style={[styles.dot, { backgroundColor: GREEN }]} />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? GREEN : colors.textMuted },
                ]}
              >
                {isActive ? "ativa" : "inativa"}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Body ───────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
      >
        {/* Toggle ativo */}
        <View
          style={[
            styles.toggleCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>
              {isActive ? "Skill ativa no perfil" : "Skill oculta do perfil público"}
            </Text>
            <Text style={[styles.toggleSub, { color: colors.textMuted }]}>
              {isActive
                ? "Aparece nas buscas e no seu perfil"
                : "Não aparece nas buscas"}
            </Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={handleToggleActive}
            trackColor={{
              false: isDark ? "#302b26" : "#d0cbc6",
              true: ACCENT,
            }}
            thumbColor={isActive ? "#fff" : isDark ? "#a09890" : "#e0dbd6"}
          />
        </View>

        {/* Info grid */}
        <View style={styles.row}>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
              CATEGORIA
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {skill.category || "—"}
            </Text>
          </View>
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
              ADICIONADA EM
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {skill.addedAt || "—"}
            </Text>
          </View>
        </View>

        {/* Descrição */}
        {!!skill.description && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
              DESCRIÇÃO
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {skill.description}
            </Text>
          </View>
        )}

        {/* Verificação */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {skill.verified ? (
            <View style={styles.verifyRow}>
              <View
                style={[
                  styles.verifyIcon,
                  { backgroundColor: "rgba(24,160,107,0.12)" },
                ]}
              >
                <Feather name="check-circle" size={16} color={GREEN} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.verifyTitle, { color: colors.text }]}>
                  Verificado pela Comunidade
                </Text>
                <Text
                  style={[styles.verifySub, { color: colors.textMuted }]}
                >
                  Validado por avaliações reais de contratos concluídos
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.verifyRow}>
              <View
                style={[
                  styles.verifyIcon,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <Feather name="clock" size={16} color={colors.textMuted} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[
                    styles.verifyTitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Aguardando verificação
                </Text>
                <Text
                  style={[styles.verifySub, { color: colors.textMuted }]}
                >
                  A verificação acontece automaticamente com avaliações de
                  contratos realizados
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Serviços */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: "rgba(224,96,48,0.12)" },
              ]}
            >
              <Feather name="briefcase" size={13} color={ACCENT} />
            </View>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
              SERVIÇOS COM ESSA SKILL
            </Text>
          </View>

          {servicesUsingSkill.length > 0 ? (
            servicesUsingSkill.map((svc) => (
              <Pressable
                key={svc.id}
                style={({ pressed }) => [
                  styles.svcRow,
                  {
                    backgroundColor: pressed
                      ? colors.rowPressed
                      : colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
                onPress={() =>
                  router.push(`/provider-service/${svc.id}` as any)
                }
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[styles.svcName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {svc.name}
                  </Text>
                  <Text style={[styles.svcMeta, { color: colors.textMuted }]}>
                    {svc.active ? "ativo" : "inativo"} · {svc.contracts}{" "}
                    {svc.contracts === 1 ? "contrato" : "contratos"}
                  </Text>
                </View>
                <Text style={[styles.svcRate, { color: ACCENT }]}>
                  R$ {svc.hourlyRate}/h
                </Text>
                <Feather
                  name="chevron-right"
                  size={14}
                  color={colors.chevron}
                />
              </Pressable>
            ))
          ) : (
            <View style={styles.emptySec}>
              <Text style={[styles.emptySecText, { color: colors.textDim }]}>
                nenhum serviço usa essa skill ainda
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <View
        style={[
          styles.cta,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.cardBorder,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/cadastro-skill")}
        >
          <Text style={styles.ctaBtnLabel}>Editar skill</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },

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
  decor: {
    position: "absolute",
    right: -6,
    fontFamily: "Sora_700Bold",
    fontSize: 90,
    letterSpacing: -3,
    lineHeight: 96,
    includeFontPadding: false,
    opacity: 0.05,
  },
  heroFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroBottom: { position: "absolute", bottom: 18, left: 16, right: 16 },
  heroTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: { fontFamily: "DMSans_500Medium", fontSize: 10 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  body: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },

  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  toggleTitle: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  toggleSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 1,
  },

  row: { flexDirection: "row", gap: 10 },
  infoCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
  },
  infoLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  infoValue: { fontFamily: "Sora_600SemiBold", fontSize: 14 },

  section: { borderRadius: 16, padding: 14, gap: 10, borderWidth: 1 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyText: {
    fontFamily: "Sora_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },

  verifyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  verifyIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  verifyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  verifySub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },

  svcRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  svcName: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  svcMeta: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  svcRate: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    flexShrink: 0,
  },

  emptySec: { paddingVertical: 14, alignItems: "center" },
  emptySecText: { fontFamily: "DMSans_400Regular", fontSize: 12 },

  emptyFull: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 13 },

  cta: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  ctaBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnLabel: {
    fontFamily: "Sora_700Bold",
    fontSize: 15,
    color: "#fff",
    letterSpacing: -0.2,
  },
});
