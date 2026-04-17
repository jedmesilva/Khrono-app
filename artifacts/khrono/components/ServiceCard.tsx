import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";

import type { Service, Skill, Tool, VerificationType } from "@/constants/profile-data";
import { formatRateValue } from "@/lib/format";

interface ServiceCardProps {
  service: Service;
  skills: Skill[];
  tools: Tool[];
  active: boolean;
  colors: {
    card: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textDim: string;
    surface: string;
    surfaceBorder: string;
    divider: string;
  };
  onPress: () => void;
  onVerifiedPress?: (type: VerificationType, context: string) => void;
}

const ACCENT = "#e06030";
const GREEN = "#00e5a0";

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

function makeDecorLabel(service: Service, skills: Skill[]): string {
  const cat = skills[0]?.type;
  const raw = cat ? cat.split(/\s+/)[0] : service.name.split(/\s+/)[0];
  return raw.slice(0, 7).toUpperCase();
}

export function ServiceCard({
  service,
  skills,
  tools,
  active,
  colors,
  onPress,
  onVerifiedPress,
}: ServiceCardProps) {
  const isDark = parseInt(colors.card.replace("#", "").slice(0, 2), 16) < 128;
  const [gradStart, gradEnd] = gradientFromId(service.id, isDark);
  const decorText = makeDecorLabel(service, skills);

  const accentBg = isDark ? "rgba(224,96,48,0.09)" : "rgba(224,96,48,0.07)";
  const accentBorder = isDark ? "rgba(224,96,48,0.24)" : "rgba(224,96,48,0.20)";
  const gridOpacity = isDark ? 0.07 : 0.05;
  const decorOpacity = isDark ? 0.09 : 0.06;

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          opacity: active ? 1 : 0.5,
        },
      ]}
      onPress={onPress}
    >
      {/* ── Thumbnail ──────────────────────────────────────── */}
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.thumb}
      >
        {/* Grid decoration */}
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 320 130"
          preserveAspectRatio="none"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Line
              key={`v${i}`}
              x1={i * 46}
              y1="0"
              x2={i * 46}
              y2="130"
              stroke={ACCENT}
              strokeWidth="1"
              opacity={gridOpacity}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <Line
              key={`h${i}`}
              x1="0"
              y1={i * 44}
              x2="320"
              y2={i * 44}
              stroke={ACCENT}
              strokeWidth="1"
              opacity={gridOpacity}
            />
          ))}
        </Svg>

        {/* Large decorative text in the background */}
        <Text
          style={[styles.decorLabel, { color: ACCENT, opacity: decorOpacity }]}
          numberOfLines={1}
        >
          {decorText}
        </Text>

        {/* Status badge — top left */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: active
                ? "rgba(0,229,160,0.12)"
                : "rgba(255,255,255,0.06)",
              borderColor: active
                ? "rgba(0,229,160,0.30)"
                : "rgba(255,255,255,0.10)",
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: active
                  ? GREEN
                  : isDark
                  ? "#504840"
                  : "#bbb",
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: active ? GREEN : isDark ? "#706860" : "#999" },
            ]}
          >
            {active ? "ativo" : "inativo"}
          </Text>
        </View>

        {/* Verified icon — top right */}
        {service.verified && (
          <Pressable
            style={styles.verifiedBtn}
            onPress={() =>
              onVerifiedPress?.(service.verified!.type, "service")
            }
            hitSlop={10}
          >
            <Feather name="check-circle" size={13} color={GREEN} />
          </Pressable>
        )}
      </LinearGradient>

      {/* ── Body ───────────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Title + Price */}
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={2}
          >
            {service.name}
          </Text>
          <View style={styles.priceBlock}>
            <Text
              style={[
                styles.price,
                { color: active ? ACCENT : colors.textMuted },
              ]}
            >
              {formatRateValue(service.hourlyRate)}
            </Text>
            <Text style={[styles.perHour, { color: colors.textDim }]}>
              /hora
            </Text>
          </View>
        </View>

        {/* Meta: rating · contracts or "novo" pill */}
        <View style={styles.metaRow}>
          {service.isNew ? (
            <View
              style={[
                styles.newBadge,
                {
                  backgroundColor: "rgba(0,229,160,0.09)",
                  borderColor: "rgba(0,229,160,0.22)",
                },
              ]}
            >
              <Text style={styles.newBadgeText}>novo</Text>
            </View>
          ) : (
            <>
              <Feather name="star" size={11} color={ACCENT} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {service.rating.toFixed(1)} · {service.contracts} contrato
                {service.contracts !== 1 ? "s" : ""}
              </Text>
            </>
          )}
        </View>

        {/* Skills chips — accent tinted */}
        {skills.length > 0 && (
          <View style={styles.chipsRow}>
            {skills.map((sk) => (
              <View
                key={sk.id}
                style={[
                  styles.chipAccent,
                  { backgroundColor: accentBg, borderColor: accentBorder },
                ]}
              >
                <Text
                  style={[styles.chipAccentText, { color: ACCENT }]}
                  numberOfLines={1}
                >
                  {sk.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tools chips — neutral */}
        {tools.length > 0 && (
          <View style={styles.chipsRow}>
            {tools.map((t) => (
              <View
                key={t.id}
                style={[
                  styles.chipNeutral,
                  { borderColor: colors.surfaceBorder },
                ]}
              >
                <Text
                  style={[
                    styles.chipNeutralText,
                    { color: colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {t.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },

  // ── Thumbnail ─────────────────────────────────────────
  thumb: {
    height: 130,
    width: "100%",
    overflow: "hidden",
  },
  decorLabel: {
    position: "absolute",
    bottom: -10,
    left: 12,
    fontFamily: "Sora_700Bold",
    fontSize: 62,
    letterSpacing: -1.5,
    lineHeight: 68,
    includeFontPadding: false,
  },
  statusBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  verifiedBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.30)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Body ──────────────────────────────────────────────
  body: {
    padding: 14,
    paddingTop: 12,
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: "Sora_700Bold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  priceBlock: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  price: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  perHour: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginTop: 2,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
  },
  newBadge: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    color: GREEN,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  chipAccent: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 180,
  },
  chipAccentText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  chipNeutral: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 180,
  },
  chipNeutralText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
});
