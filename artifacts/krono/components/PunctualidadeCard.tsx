import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type PunctualidadeStats = {
  total: number;
  noHorario: number;
  antes: number;
  atrasado: number;
  percentual: number;
};

const TOLERANCE_MS = 5 * 60_000;

export function computePunctualidade(
  contracts: { scheduled_for: string | null; started_at: string | null }[]
): PunctualidadeStats {
  let noHorario = 0;
  let antes = 0;
  let atrasado = 0;

  for (const c of contracts) {
    if (!c.scheduled_for || !c.started_at) continue;
    const delta = new Date(c.started_at).getTime() - new Date(c.scheduled_for).getTime();
    if (Math.abs(delta) <= TOLERANCE_MS) noHorario++;
    else if (delta < 0) antes++;
    else atrasado++;
  }

  const total = noHorario + antes + atrasado;
  const percentual = total > 0 ? Math.round(((noHorario + antes) / total) * 100) : 0;

  return { total, noHorario, antes, atrasado, percentual };
}

type Props = {
  stats: PunctualidadeStats;
  colors: any;
  style?: object;
};

export function PunctualidadeCard({ stats, colors, style }: Props) {
  if (stats.total < 3) return null;

  const pct = stats.percentual;
  const pctColor = pct >= 85 ? "#18a06b" : pct >= 65 ? "#ffaa00" : "#e05050";

  const rows: { icon: string; label: string; count: number; color: string }[] = [
    { icon: "check-circle", label: "No horário",  count: stats.noHorario, color: "#18a06b" },
    { icon: "arrow-up",     label: "Antes do previsto", count: stats.antes,     color: "#4ea8de" },
    { icon: "clock",        label: "Atrasado",    count: stats.atrasado, color: "#e05050" },
  ];

  return (
    <View style={[card.wrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }, style]}>
      <View style={card.topRow}>
        <View style={[card.iconWrap, { backgroundColor: pctColor + "18" }]}>
          <Feather name="clock" size={14} color={pctColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[card.title, { color: colors.textSecondary }]}>Pontualidade</Text>
          <Text style={[card.sub, { color: colors.textMuted }]}>
            {stats.total} {stats.total === 1 ? "contrato agendado" : "contratos agendados"}
          </Text>
        </View>
        <Text style={[card.pct, { color: pctColor }]}>{pct}%</Text>
      </View>

      <View style={[card.divider, { backgroundColor: colors.divider }]} />

      <View style={card.rows}>
        {rows.map((r) => (
          <View key={r.label} style={card.row}>
            <View style={[card.dot, { backgroundColor: r.color + "22", borderColor: r.color + "44" }]}>
              <Feather name={r.icon as any} size={11} color={r.color} />
            </View>
            <Text style={[card.rowLabel, { color: colors.textMuted }]}>{r.label}</Text>
            <Text style={[card.rowCount, { color: colors.text }]}>{r.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  sub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  pct: {
    fontFamily: "Sora_700Bold",
    fontSize: 26,
    letterSpacing: -1,
  },
  divider: {
    height: 1,
  },
  rows: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    flex: 1,
  },
  rowCount: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
});
