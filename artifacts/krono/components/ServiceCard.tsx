import { Feather } from "@expo/vector-icons";
import { VerifiedIcon } from "@/components/VerifiedBadge";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
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
      style={styles.chipsRow}
      onLayout={(e) => {
        containerW.current = e.nativeEvent.layout.width;
        compute();
      }}
    >
      {visibleCount === null &&
        items.map((item) => (
          <View
            key={`m_${item.id}`}
            style={styles.chipMeasure}
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
        <View
          style={[
            styles.overflowBadge,
            { backgroundColor: overflowBg, borderColor: overflowBorder },
          ]}
        >
          <Text style={[styles.overflowText, { color: overflowColor }]}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
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
          viewBox="0 0 320 168"
          preserveAspectRatio="none"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Line
              key={`v${i}`}
              x1={i * 46}
              y1="0"
              x2={i * 46}
              y2="168"
              stroke={ACCENT}
              strokeWidth="1"
              opacity={gridOpacity}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <Line
              key={`h${i}`}
              x1="0"
              y1={i * 42}
              x2="320"
              y2={i * 42}
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

        {/* Top-right: "novo" badge and/or verified icon */}
        <View style={styles.topRight}>
          {service.isNew && (
            <View style={styles.novoBadge}>
              <Text style={styles.novoBadgeText}>novo</Text>
            </View>
          )}
          {service.verified && (
            <Pressable
              style={styles.verifiedBtn}
              onPress={() =>
                onVerifiedPress?.(service.verified!.type, "service")
              }
              hitSlop={10}
            >
              <VerifiedIcon size={13} color={GREEN} />
            </Pressable>
          )}
        </View>
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

        {/* Meta: rating · contracts */}
        <View style={styles.metaRow}>
          {service.rating > 0 && (
            <>
              <Feather name="star" size={11} color={ACCENT} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {service.rating.toFixed(1)}
              </Text>
              <Text style={[styles.metaDivider, { color: colors.textDim }]}>·</Text>
            </>
          )}
          <Feather name="file-text" size={11} color={colors.textDim} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {service.contracts} contrato{service.contracts !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Skills row */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
              skills
            </Text>
            <ChipOverflowRow
              key={skills.map((s) => s.id).join()}
              items={skills}
              overflowBg={accentBg}
              overflowBorder={accentBorder}
              overflowColor={ACCENT}
              renderChip={(sk) => (
                <View
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
              )}
            />
          </View>
        )}

        {/* Tools row */}
        {tools.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
              tools
            </Text>
            <ChipOverflowRow
              key={tools.map((t) => t.id).join()}
              items={tools}
              overflowBg={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}
              overflowBorder={colors.surfaceBorder}
              overflowColor={colors.textMuted}
              renderChip={(t) => (
                <View
                  style={[
                    styles.chipNeutral,
                    { borderColor: colors.surfaceBorder },
                  ]}
                >
                  <Text
                    style={[styles.chipNeutralText, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {t.name}
                  </Text>
                </View>
              )}
            />
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
    height: 168,
    width: "100%",
    overflow: "hidden",
  },
  decorLabel: {
    position: "absolute",
    bottom: -14,
    left: 12,
    fontFamily: "Sora_700Bold",
    fontSize: 76,
    letterSpacing: -2,
    lineHeight: 82,
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
  topRight: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 5,
  },
  novoBadge: {
    backgroundColor: "rgba(0,229,160,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,229,160,0.35)",
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  novoBadgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: GREEN,
  },
  verifiedBtn: {
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
  metaDivider: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    marginHorizontal: 1,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 5,
  },
  chipMeasure: {
    opacity: 0,
    position: "absolute",
  },
  overflowBadge: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: OVERFLOW_BADGE_W,
  },
  overflowText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
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
