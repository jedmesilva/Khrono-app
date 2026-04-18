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
import { useServices } from "@/context/ServicesContext";
import { VERIFICATION_LABELS, VerificationType } from "@/constants/profile-data";

const ACCENT = "#e06030";
const GREEN = "#18a06b";
const ORANGE_PENDING = "#d97706";
const HERO_H = 220;

const DARK_PAIRS: [string, string][] = [
  ["#151519", "#100e0c"],
  ["#181218", "#100e0c"],
  ["#121a17", "#100e0c"],
  ["#16130d", "#100e0c"],
  ["#0d1418", "#100e0c"],
];
const LIGHT_PAIRS: [string, string][] = [
  ["#e9eaf0", "#f8f5f2"],
  ["#ede6ef", "#f8f5f2"],
  ["#e6ede9", "#f8f5f2"],
  ["#f0ece3", "#f8f5f2"],
  ["#e3eaf0", "#f8f5f2"],
];

function pickGradient(id: string, isDark: boolean): [string, string] {
  const pal = isDark ? DARK_PAIRS : LIGHT_PAIRS;
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return pal[n % pal.length];
}

const VERIFY_STATUS = {
  unverified: { label: "Não verificado", color: null, icon: "shield-off" as const },
  pending: { label: "Verificação pendente", color: ORANGE_PENDING, icon: "clock" as const },
  verified: { label: "Verificado pela Khrono", color: GREEN, icon: "shield" as const },
};

export default function ToolDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { myTools, toggleToolAvailable, removeTool, requestToolVerification } = useServices();
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    buttons?: AppDialogButton[];
  } | null>(null);

  const tool = useMemo(
    () => myTools.find((t) => t.id === id) ?? null,
    [myTools, id]
  );

  const [available, setAvailable] = useState(() => tool?.available ?? true);

  const gradient = useMemo(
    () => pickGradient(tool?.id ?? "default", isDark),
    [tool?.id, isDark]
  );

  const decorLabel = (tool?.type || tool?.name || "TOOL")
    .slice(0, 7)
    .toUpperCase();

  const vstatus = tool?.verificationStatus ?? "unverified";
  const verifyMeta = VERIFY_STATUS[vstatus] ?? VERIFY_STATUS.unverified;

  async function handleToggleAvailable(val: boolean) {
    setAvailable(val);
    await toggleToolAvailable(id!, val);
  }

  async function handleRequestVerification() {
    if (!tool || vstatus !== "unverified") return;
    setDialog({
      title: "Solicitar verificação",
      message:
        "Nossa equipe irá analisar as informações da ferramenta. Você receberá uma notificação com o resultado em até 5 dias úteis.",
      buttons: [
        { label: "Cancelar", onPress: () => setDialog(null) },
        {
          label: "Solicitar",
          onPress: async () => {
            setDialog(null);
            await requestToolVerification(id!);
          },
        },
      ],
    });
  }

  function handleOptions() {
    if (!tool) return;
    setDialog({
      title: tool.name,
      buttons: [
        {
          label: available ? "Marcar como indisponível" : "Marcar como disponível",
          onPress: () => {
            setDialog(null);
            handleToggleAvailable(!available);
          },
        },
        ...(vstatus === "unverified"
          ? [
              {
                label: "Solicitar verificação",
                onPress: () => {
                  setDialog(null);
                  handleRequestVerification();
                },
              },
            ]
          : []),
        {
          label: "Editar ferramenta",
          onPress: () => {
            setDialog(null);
            router.push("/cadastro-tool");
          },
        },
        {
          label: "Excluir ferramenta",
          style: "destructive" as const,
          onPress: () => {
            setDialog({
              title: "Excluir ferramenta?",
              message: `"${tool.name}" será removida do seu perfil permanentemente.`,
              buttons: [
                { label: "Cancelar", onPress: () => setDialog(null) },
                {
                  label: "Excluir",
                  style: "destructive" as const,
                  onPress: async () => {
                    setDialog(null);
                    await removeTool(tool.id);
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

  if (!tool) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 20,
          },
        ]}
      >
        <View style={styles.emptyFull}>
          <Feather name="alert-circle" size={28} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.textDim }]}>
            ferramenta não encontrada
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
              {tool.name}
            </Text>
            {tool.verified && (
              <VerifiedBadge
                onPress={() =>
                  setDialog({
                    title: VERIFICATION_LABELS[tool.verified!.type],
                    message:
                      "Essa ferramenta foi verificada pela equipe Khrono com base na documentação enviada.",
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
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.06)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.10)",
                },
              ]}
            >
              <Text
                style={[styles.chipText, { color: isDark ? "#c0bab4" : "#6a6460" }]}
              >
                {tool.type}
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: available
                    ? "rgba(24,160,107,0.14)"
                    : isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.07)",
                  borderColor: available
                    ? "rgba(24,160,107,0.32)"
                    : isDark
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(0,0,0,0.14)",
                },
              ]}
            >
              {available && (
                <View style={[styles.dot, { backgroundColor: GREEN }]} />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: available ? GREEN : colors.textMuted },
                ]}
              >
                {available ? "disponível" : "indisponível"}
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
        {/* Toggle disponível */}
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
              {available
                ? "Ferramenta disponível"
                : "Ferramenta indisponível"}
            </Text>
            <Text style={[styles.toggleSub, { color: colors.textMuted }]}>
              {available
                ? "Aparece como disponível nos serviços"
                : "Marcada como temporariamente indisponível"}
            </Text>
          </View>
          <Switch
            value={available}
            onValueChange={handleToggleAvailable}
            trackColor={{
              false: isDark ? "#302b26" : "#d0cbc6",
              true: ACCENT,
            }}
            thumbColor={available ? "#fff" : isDark ? "#a09890" : "#e0dbd6"}
          />
        </View>

        {/* Info grid — tipo e data */}
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
              TIPO
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {tool.type || "—"}
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
              {tool.addedAt || "—"}
            </Text>
          </View>
        </View>

        {/* Marca / Modelo / Ano */}
        {(tool.brand || tool.model || tool.year) && (
          <View style={styles.row}>
            {tool.brand && (
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
                  MARCA
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {tool.brand}
                </Text>
              </View>
            )}
            {tool.model && (
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
                  MODELO
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {tool.model}
                </Text>
              </View>
            )}
            {tool.year && (
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
                  ANO
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {tool.year}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Detalhes */}
        {!!tool.details && (
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
              DETALHES
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {tool.details}
            </Text>
          </View>
        )}

        {/* Verificação Khrono */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.verifyRow}>
            <View
              style={[
                styles.verifyIcon,
                {
                  backgroundColor:
                    vstatus === "verified"
                      ? "rgba(24,160,107,0.12)"
                      : vstatus === "pending"
                      ? "rgba(217,119,6,0.12)"
                      : isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              <Feather
                name={verifyMeta.icon}
                size={16}
                color={verifyMeta.color ?? colors.textMuted}
              />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  styles.verifyTitle,
                  {
                    color:
                      vstatus === "verified"
                        ? GREEN
                        : vstatus === "pending"
                        ? ORANGE_PENDING
                        : colors.textSecondary,
                  },
                ]}
              >
                {verifyMeta.label}
              </Text>
              <Text style={[styles.verifySub, { color: colors.textMuted }]}>
                {vstatus === "verified"
                  ? "Documentação analisada e aprovada pela equipe Khrono"
                  : vstatus === "pending"
                  ? "Análise em andamento — você será notificado em até 5 dias úteis"
                  : "Envie a documentação para verificar a autenticidade desta ferramenta"}
              </Text>
            </View>
          </View>

          {vstatus === "unverified" && (
            <TouchableOpacity
              style={[
                styles.verifyBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.10)",
                },
              ]}
              activeOpacity={0.75}
              onPress={handleRequestVerification}
            >
              <Feather name="file-text" size={13} color={ACCENT} />
              <Text style={[styles.verifyBtnLabel, { color: ACCENT }]}>
                Solicitar verificação por documentação
              </Text>
            </TouchableOpacity>
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
          onPress={() => router.push("/cadastro-tool")}
        >
          <Text style={styles.ctaBtnLabel}>Editar ferramenta</Text>
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
  toggleSub: { fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 1 },

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
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  verifyBtnLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
  },

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
