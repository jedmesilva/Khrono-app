import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { Contract } from "@/context/ContractsContext";
import { formatCurrency } from "@/lib/format";

// ── helpers ────────────────────────────────────────────────────────────────────

function formatTime(totalSecs: number): string {
  const abs = Math.abs(Math.floor(totalSecs));
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

function formatHM(secs: number): string {
  const abs = Math.max(0, Math.floor(secs));
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatScheduledTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatScheduledDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === tomorrow.toDateString()) return "Amanhã";
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

// ── role theme tokens ──────────────────────────────────────────────────────────

const ROLE_THEME = {
  hiring: {
    headerBg: "#1E1C19",
    amountColor: "#F2EFE9",
    relationColor: "rgba(255,255,255,0.45)",
    nameColor: "rgba(255,255,255,0.85)",
    badgeBg: "rgba(255,255,255,0.08)",
    badgeText: "rgba(255,255,255,0.45)",
    bodyMuted: "#9B9487",
    bodyFaint: "#B8B4AC",
    progressBg: "#3D3B37",
    progressFg: "#6B6760",
    ctaColor: "#F2EFE9",
    footerMuted: "#B8B4AC",
    footerTimer: "#9B9487",
    liveColor: "#5A9E6F",
    arrowColor: "rgba(255,255,255,0.45)",
  },
  hired: {
    headerBg: "#FDF3EE",
    amountColor: "#C0622A",
    relationColor: "#9B7060",
    nameColor: "#2C2A26",
    badgeBg: "#F4D0BC",
    badgeText: "#C0622A",
    bodyMuted: "#9B9487",
    bodyFaint: "#B8B4AC",
    progressBg: "#C0622A",
    progressFg: "#E8956A",
    ctaColor: "#2C2A26",
    footerMuted: "#B8B4AC",
    footerTimer: "#9B9487",
    liveColor: "#5A9E6F",
    arrowColor: "#C0622A",
  },
};

// ── types ──────────────────────────────────────────────────────────────────────

type Props = {
  contract: Contract;
  onStop?: (id: string) => void;
  onAccept?: (id: string) => void;
  onBegin?: (id: string) => void;
  onPress?: () => void;
};

// ── ScheduledContractCard ──────────────────────────────────────────────────────

function ScheduledContractCard({ contract, onPress }: { contract: Contract; onPress?: () => void }) {
  const { colors } = useTheme();
  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const scheduledDate = new Date(contract.scheduledFor ?? 0);
  const isValidDate = !isNaN(scheduledDate.getTime()) && (contract.scheduledFor ?? 0) > 0;
  const totalFixedSecs = contract.duracaoTotal ? contract.duracaoTotal / 1000 : null;
  const scheduledAmount = isTimer && totalFixedSecs
    ? contract.ratePerHour * (totalFixedSecs / 3600)
    : null;

  const [scheduledDelta, setScheduledDelta] = useState(() =>
    Math.floor((scheduledDate.getTime() - Date.now()) / 1000)
  );
  const isLate = scheduledDelta < 0;
  const scheduledDeltaAbs = Math.abs(scheduledDelta);

  useEffect(() => {
    const id = setInterval(() => {
      setScheduledDelta(Math.floor((scheduledDate.getTime() - Date.now()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [scheduledDate]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder, borderStyle: "dashed" },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#F7F5F0" }]}>
        <View style={styles.headerTop}>
          <Feather name={isHiring ? "arrow-up-right" : "arrow-down-left"} size={13} color="#B8B4AC" />
          <Text style={[styles.headerRelation, { color: "#B8B4AC" }]}>
            {isHiring ? (
              <>{"Você contratou "}<Text style={[styles.headerName, { color: "#6B6760" }]}>{contract.person.name}</Text></>
            ) : (
              <><Text style={[styles.headerName, { color: "#6B6760" }]}>{contract.person.name}</Text>{" contratou você"}</>
            )}
          </Text>
        </View>
        <View style={styles.headerBottom}>
          {scheduledAmount !== null ? (
            <Text style={[styles.headerAmount, { color: "#9B9487" }]}>
              {formatCurrency(scheduledAmount)}
            </Text>
          ) : (
            <View />
          )}
          <View style={[styles.durationBadge, { backgroundColor: "#ECEAE3" }]}>
            <Feather name="clock" size={9} color="#9B9487" />
            <Text style={[styles.durationBadgeText, { color: "#9B9487" }]}>
              {isTimer && totalFixedSecs ? formatHM(totalFixedSecs) : "Aberto"}
            </Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.serviceRow}>
          <Text style={[styles.serviceName, { color: "#9B9487" }]} numberOfLines={1}>
            {contract.servico?.nome ?? contract.person.skill ?? "Serviço"}
          </Text>
          <Text style={[styles.serviceRate, { color: "#9B9487" }]}>
            R$ {contract.ratePerHour}/h
          </Text>
        </View>

        {!!contract.location && (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={10} color="#C4BFB6" />
            <Text style={styles.locationText} numberOfLines={1}>{contract.location}</Text>
            {contract.person.distancia != null && (
              <Text style={styles.locationDistText}>{contract.person.distancia} km</Text>
            )}
          </View>
        )}

        <View style={styles.scheduledBlock}>
          <View style={styles.scheduledLabelRow}>
            <Feather name="calendar" size={10} color="#B8B4AC" />
            <Text style={styles.scheduledLabel}>Agendado para</Text>
          </View>
          <View style={styles.scheduledTimeRow}>
            <Text style={styles.scheduledTimeText}>
              {isValidDate ? formatScheduledTime(scheduledDate) : "—"}
            </Text>
            <Text style={styles.scheduledDateText}>
              {isValidDate ? formatScheduledDate(scheduledDate) : "Data não definida"}
            </Text>
          </View>
          {isValidDate && (
            <View style={styles.startsInPill}>
              <Feather name={isLate ? "alert-circle" : "clock"} size={10} color={isLate ? "#C0622A" : "#9B9487"} />
              <Text style={[styles.startsInLabel, isLate && { color: "#C0622A" }]}>
                {isLate ? "Início atrasado em" : "Inicia em"}
              </Text>
              <Text style={[styles.startsInValue, isLate && { color: "#C0622A" }]}>
                {formatTime(scheduledDeltaAbs)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={[styles.footerMuted, { color: isLate ? "#C0622A" : "#B8B4AC" }]}>
            {isLate ? "Início atrasado em" : "Inicia em"}
          </Text>
          <Text style={[styles.footerTimer, { color: isLate ? "#C0622A" : "#9B9487" }]}>
            {isValidDate ? formatHM(scheduledDeltaAbs) : "—"}
          </Text>
        </View>
        <View style={styles.footerCta}>
          <Text style={[styles.footerCtaText, { color: "#2C2A26" }]}>Ver contrato</Text>
          <Feather name="chevron-right" size={13} color="#2C2A26" />
        </View>
      </View>
    </Pressable>
  );
}

// ── ContractCard (active / pending) ───────────────────────────────────────────

export function ContractCard({ contract, onAccept, onBegin, onPress }: Props) {
  const { colors } = useTheme();
  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const isActive = contract.status === "active";
  const isPending = contract.status === "pending_signature";
  const isAccepted = contract.status === "accepted";
  const isPendingEnd = contract.status === "pending_end";
  const isPendingCancel = contract.status === "pending_cancel";
  const isScheduled = !!contract.scheduledFor && !isActive;

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (isScheduled || !isActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isScheduled, isActive]);

  if (isScheduled) {
    return <ScheduledContractCard contract={contract} onPress={onPress} />;
  }

  const t = ROLE_THEME[isHiring ? "hiring" : "hired"];
  const elapsedMs = isActive ? now - contract.startedAt : 0;
  const elapsedSecs = elapsedMs / 1000;
  const totalFixedSecs = contract.duracaoTotal ? contract.duracaoTotal / 1000 : null;
  const progress = totalFixedSecs ? Math.min(elapsedSecs / totalFixedSecs, 1) : null;
  const isOverdue = isTimer && totalFixedSecs !== null && elapsedSecs > totalFixedSecs;
  const remainingSecs = totalFixedSecs !== null ? Math.max(totalFixedSecs - elapsedSecs, 0) : null;
  const isPendingState = isPendingEnd || isPendingCancel;

  const amount = isTimer && totalFixedSecs
    ? contract.ratePerHour * (totalFixedSecs / 3600)
    : (elapsedSecs / 3600) * contract.ratePerHour;

  const showAmount = !isPending && !isAccepted && !isPendingState;
  const showElapsed = !isPending && !isAccepted && !isPendingState;
  const footerLabel = showElapsed ? "Iniciado há" : "Aguardando início";
  const footerValue = showElapsed ? formatHM(elapsedSecs) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isPendingState
            ? (isPendingEnd ? "#ffaa0040" : "#e0603040")
            : colors.cardBorder,
        },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg }]}>
        <View style={styles.headerTop}>
          <Feather
            name={isHiring ? "arrow-up-right" : "arrow-down-left"}
            size={13}
            color={t.arrowColor}
          />
          <Text style={[styles.headerRelation, { color: t.relationColor }]}>
            {isHiring ? (
              <>{"Você contratou "}<Text style={[styles.headerName, { color: t.nameColor }]}>{contract.person.name}</Text></>
            ) : (
              <><Text style={[styles.headerName, { color: t.nameColor }]}>{contract.person.name}</Text>{" contratou você"}</>
            )}
          </Text>
        </View>
        <View style={styles.headerBottom}>
          <Text style={[styles.headerAmount, { color: isOverdue ? "#E8956A" : t.amountColor }]}>
            {formatCurrency(showAmount ? amount : 0)}
          </Text>
          <View style={[styles.durationBadge, { backgroundColor: t.badgeBg }]}>
            <Feather
              name={isTimer ? "clock" : "activity"}
              size={9}
              color={t.badgeText}
            />
            <Text style={[styles.durationBadgeText, { color: t.badgeText }]}>
              {isTimer && totalFixedSecs ? formatHM(totalFixedSecs) : "Aberto"}
            </Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Service + rate */}
        <View style={styles.serviceRow}>
          <Text style={[styles.serviceName, { color: t.bodyMuted }]} numberOfLines={1}>
            {contract.servico?.nome ?? contract.person.skill ?? "Serviço"}
          </Text>
          <Text style={[styles.serviceRate, { color: t.bodyMuted }]}>
            R$ {contract.ratePerHour}/h
          </Text>
        </View>

        {!!contract.location && (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={10} color="#C4BFB6" />
            <Text style={styles.locationText} numberOfLines={1}>{contract.location}</Text>
            {contract.person.distancia != null && (
              <Text style={styles.locationDistText}>{contract.person.distancia} km</Text>
            )}
          </View>
        )}

        {/* Elapsed timer */}
        <View style={styles.elapsedBlock}>
          <View style={styles.elapsedLabelRow}>
            <View style={[styles.liveDot, { backgroundColor: isOverdue ? "#C0622A" : t.liveColor }]} />
            <Text style={[styles.elapsedLabel, { color: t.bodyFaint }]}>Tempo decorrido</Text>
          </View>
          <Text style={[styles.elapsedTime, { color: colors.text }]}>
            {showElapsed ? formatTime(elapsedSecs) : "00:00:00"}
          </Text>
        </View>

        {/* Progress bar (fixed-duration contracts) */}
        {isTimer && totalFixedSecs && (
          <View style={styles.progressBlock}>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabel, { color: t.bodyFaint }]}>Progresso</Text>
              <Text style={[
                styles.progressRemaining,
                {
                  color: isOverdue ? "#C0622A" : t.bodyMuted,
                  fontFamily: isOverdue ? "DMSans_600SemiBold" : "DMSans_400Regular",
                },
              ]}>
                {isOverdue ? "tempo esgotado" : `${formatHM(remainingSecs ?? 0)} restante`}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceBorder }]}>
              <View style={[
                styles.progressFill,
                {
                  width: `${Math.min((progress ?? 0) * 100, 100)}%` as any,
                  backgroundColor: isOverdue ? "#C0622A" : t.progressBg,
                },
              ]} />
            </View>
          </View>
        )}

        {/* Action: accept pending contract */}
        {isPending && !isHiring && (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: pressed ? colors.accentPressed : colors.accent },
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAccept?.(contract.id);
            }}
          >
            <Feather name="check" size={14} color={colors.btnActionText} />
            <Text style={[styles.actionBtnText, { color: colors.btnActionText }]}>Aceitar contrato</Text>
          </Pressable>
        )}

        {/* Waiting for hired to accept */}
        {isPending && isHiring && (
          <View style={[styles.waitingRow, { borderColor: "#e0603025", backgroundColor: "#e0603008" }]}>
            <Feather name="clock" size={12} color="#e0603099" />
            <Text style={[styles.waitingText, { color: "#e0603099" }]}>
              Aguardando aceite do contratado
            </Text>
          </View>
        )}

        {/* Begin contract */}
        {isAccepted && (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: pressed ? colors.accentPressed : colors.accent },
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onBegin?.(contract.id);
            }}
          >
            <Feather name="play" size={14} color={colors.btnActionText} />
            <Text style={[styles.actionBtnText, { color: colors.btnActionText }]}>Iniciar contrato</Text>
          </Pressable>
        )}

        {/* Pending end */}
        {isPendingEnd && (
          <View style={[styles.waitingRow, { borderColor: "#ffaa0040", backgroundColor: "#ffaa0008" }]}>
            <Feather name="flag" size={12} color="#ffaa00" />
            <Text style={[styles.waitingText, { color: "#ffaa00" }]}>
              {contract.endRequestedBy === contract.person.profileId
                ? "Confirmar encerramento — toque para ver"
                : "Encerramento aguardando confirmação"}
            </Text>
          </View>
        )}

        {/* Pending cancel */}
        {isPendingCancel && (
          <View style={[styles.waitingRow, { borderColor: "#e0603040", backgroundColor: "#e0603008" }]}>
            <Feather name="x-circle" size={12} color="#e06030" />
            <Text style={[styles.waitingText, { color: "#e06030" }]}>
              {contract.cancelRequestedBy === contract.person.profileId
                ? "Confirmar cancelamento — toque para ver"
                : "Cancelamento aguardando confirmação"}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={[styles.footerMuted, { color: t.footerMuted }]}>{footerLabel}</Text>
          {footerValue != null && (
            <Text style={[styles.footerTimer, { color: t.footerTimer }]}>
              {footerValue}
            </Text>
          )}
        </View>
        <View style={styles.footerCta}>
          <Text style={[styles.footerCtaText, { color: t.ctaColor }]}>Ver contrato</Text>
          <Feather name="chevron-right" size={13} color={t.ctaColor} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },

  // ── header ────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  headerRelation: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    flex: 1,
  },
  headerName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  headerBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerAmount: {
    fontFamily: "Sora_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  durationBadgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // ── body ──────────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  serviceName: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    flex: 1,
  },
  serviceRate: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    flexShrink: 0,
    marginLeft: 8,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 14,
    marginTop: -8,
  },
  locationText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#C4BFB6",
    flex: 1,
  },
  locationDistText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#B8B4AC",
    flexShrink: 0,
  },

  // elapsed
  elapsedBlock: {
    marginBottom: 16,
  },
  elapsedLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  elapsedLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  elapsedTime: {
    fontFamily: "DMSans_400Regular",
    fontSize: 36,
    letterSpacing: -1.5,
    lineHeight: 42,
  },

  // progress
  progressBlock: {
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  progressLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
  },
  progressRemaining: {
    fontSize: 10,
  },
  progressTrack: {
    height: 4,
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
  },

  // action buttons / waiting states
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  actionBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  actionBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    justifyContent: "center",
    marginBottom: 8,
  },
  waitingText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 0.3,
  },

  // ── footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerMuted: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  footerTimer: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  footerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerCtaText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },

  // ── scheduled card specifics ──────────────────────────────────────────────
  scheduledBlock: {
    marginBottom: 16,
  },
  scheduledLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  scheduledLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#C4BFB6",
    textTransform: "uppercase",
  },
  scheduledTimeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 12,
  },
  scheduledTimeText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 36,
    letterSpacing: -1.5,
    lineHeight: 42,
    color: "#2C2A26",
  },
  scheduledDateText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#9B9487",
    paddingBottom: 4,
  },
  startsInPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0EDE6",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  startsInLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#9B9487",
  },
  startsInValue: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    color: "#2C2A26",
  },
});
