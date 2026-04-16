import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ExpoLocation from "expo-location";
import Svg, { Line, Path, Rect } from "react-native-svg";
import * as Calendar from "expo-calendar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/AppButton";
import { AppDialog } from "@/components/AppDialog";
import { ContractPaymentSheet } from "@/components/ContractPaymentSheet";
import { ReasonSheet } from "@/components/ReasonSheet";
import { useToast } from "@/context/ToastContext";
import {
  Contract,
  isContractRunning,
  useContracts,
} from "@/context/ContractsContext";
import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { GlobalStyles } from "@/constants/globalStyles";
import { formatCurrency } from "@/lib/format";
import { useConfirmation, ProviderData, ProviderService } from "@/context/ConfirmationContext";

// ─── Role theme tokens (mirrors ContractCard) ─────────────────────────────────

const ROLE_THEME = {
  hiring: {
    headerBg: "#1E1C19",
    amountColor: "#F2EFE9",
    relationColor: "rgba(255,255,255,0.45)",
    nameColor: "rgba(255,255,255,0.85)",
    badgeBg: "rgba(255,255,255,0.08)",
    badgeText: "rgba(255,255,255,0.45)",
    bodyMuted: "#9B9487",
    arrowColor: "rgba(255,255,255,0.45)",
    chevronColor: "rgba(255,255,255,0.25)",
  },
  hired: {
    headerBg: "#FDF3EE",
    amountColor: "#C0622A",
    relationColor: "#9B7060",
    nameColor: "#2C2A26",
    badgeBg: "#F4D0BC",
    badgeText: "#C0622A",
    bodyMuted: "#9B9487",
    arrowColor: "#C0622A",
    chevronColor: "#C0622A66",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHM(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

function formatTimerDisplay(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function formatCountdown(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

function formatData(ts: number): string {
  const d = new Date(ts);
  const dia = String(d.getDate()).padStart(2, "0");
  const meses = [
    "jan","fev","mar","abr","mai","jun",
    "jul","ago","set","out","nov","dez",
  ];
  const mes = meses[d.getMonth()];
  const ano = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia} ${mes} ${ano} · ${h}:${min}`;
}

function paymentLabel(contract: Contract): string {
  switch (contract.paymentMethod) {
    case "cartao": return contract.paymentCardLabel ?? "Cartão";
    case "pix": return "Pix";
    case "dinheiro": return "Dinheiro";
    case "saldo": return "Saldo Khrono";
    default: return "—";
  }
}

function paymentIconName(pm?: string): "credit-card" | "zap" | "layers" | "dollar-sign" {
  switch (pm) {
    case "cartao": return "credit-card";
    case "pix": return "zap";
    case "saldo": return "layers";
    default: return "dollar-sign";
  }
}

function getPaymentStatusInfo(
  paymentMethod: Contract["paymentMethod"],
  paymentStatus: Contract["paymentStatus"],
  personName: string,
  isHiring: boolean,
  isEnded: boolean
): { text: string; tone: "green" | "amber" | "red" | "muted" } {
  if (paymentMethod === "dinheiro") {
    if (paymentStatus === "paid") return { text: "Dinheiro confirmado", tone: "green" };
    if (paymentStatus === "disputed") return { text: "Pagamento em disputa", tone: "red" };
    if (paymentStatus === "awaiting_confirmation") {
      return {
        text: isHiring
          ? `Confirme o pagamento para ${personName}`
          : `Confirme o recebimento de ${personName}`,
        tone: "amber",
      };
    }
    return {
      text: isHiring
        ? `À pagar para ${personName}`
        : `À receber de ${personName}`,
      tone: "muted",
    };
  }
  if (paymentStatus === "paid") return { text: "Pago", tone: "green" };
  if (paymentStatus === "failed") return { text: "Falha no pagamento", tone: "red" };
  if (isEnded) return { text: "Pendente", tone: "amber" };
  return { text: "Na conclusão do serviço", tone: "muted" };
}

function getValueLabel(contract: Contract): string {
  if (contract.status === "disputed") {
    return "em disputa";
  }
  if (contract.status === "ended") {
    return contract.role === "hiring" ? "pago" : "recebido";
  }
  return contract.role === "hiring" ? "a pagar" : "a receber";
}

// ─── Location Row ─────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const native =
    Platform.OS === "ios"
      ? `maps://0,0?daddr=${encoded}`
      : `geo:0,0?q=${encoded}`;
  Linking.canOpenURL(native).then((ok) => {
    Linking.openURL(ok ? native : `https://maps.google.com/?q=${encoded}`);
  });
}

function LocationRow({
  location,
  colors,
}: {
  location: string;
  colors: ColorPalette;
}) {
  const [distance, setDistance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const [pos, geocoded] = await Promise.all([
          ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Balanced,
          }),
          ExpoLocation.geocodeAsync(location),
        ]);
        if (cancelled || !geocoded.length) return;
        const km = haversineKm(
          pos.coords.latitude,
          pos.coords.longitude,
          geocoded[0].latitude,
          geocoded[0].longitude
        );
        setDistance(formatDistance(km));
      } catch {
        // distância é opcional — falha silenciosa
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location]);

  return (
    <View style={[s.detailRow, { borderBottomColor: colors.divider }]}>
      <View style={[s.iconWrap, { backgroundColor: colors.surface }]}>
        <Feather name="map-pin" size={15} color={colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.detailTitle, { color: colors.text }]} numberOfLines={2}>
          {location}
        </Text>
        <Text style={[s.detailSub, { color: colors.textMuted }]}>
          {distance ? `${distance} de você · Endereço do serviço` : "Endereço do serviço"}
        </Text>
      </View>
      <Pressable
        onPress={() => openMaps(location)}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.accent + "40",
          backgroundColor: colors.accent + (pressed ? "20" : "10"),
        })}
      >
        <Feather name="navigation" size={11} color={colors.accent} />
        <Text
          style={{
            fontFamily: "DMSans_500Medium",
            fontSize: 11,
            color: colors.accent,
          }}
        >
          Navegar
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Service Row ──────────────────────────────────────────────────────────────

function ServiceRow({
  servico,
  colors,
}: {
  servico: NonNullable<import("@/context/ContractsContext").Contract["servico"]>;
  colors: ColorPalette;
}) {
  const subtitle = [
    servico.skill && servico.skill !== servico.nome ? servico.skill : null,
    servico.ratePerHour
      ? `R$${servico.ratePerHour.toFixed(0).replace(".", ",")}/h`
      : null,
    servico.nota ? `★ ${servico.nota.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[s.detailRow, { borderBottomColor: colors.divider }]}>
      <View style={[s.iconWrap, { backgroundColor: colors.surface }]}>
        <Feather name="tool" size={15} color={colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.detailTitle, { color: colors.text }]} numberOfLines={1}>
          {servico.nome}
        </Text>
        {!!subtitle && (
          <Text style={[s.detailSub, { color: colors.textMuted }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Arc Progress ─────────────────────────────────────────────────────────────

const ARC_CX = 104;
const ARC_CY = 108;
const ARC_R = 80;
const ARC_START = -215;
const ARC_SWEEP = 250;

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: ARC_CX + r * Math.cos(rad), y: ARC_CY + r * Math.sin(rad) };
}

function buildArcPath(startDeg: number, sweepDeg: number, r: number): string {
  const s = polarToXY(startDeg, r);
  const e = polarToXY(startDeg + sweepDeg, r);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function ArcProgress({
  elapsedMs,
  totalMs,
  accumulatedAmount,
  totalContractAmount,
  showBreakdown,
  valueLabel,
  colors,
}: {
  elapsedMs: number;
  totalMs: number;
  accumulatedAmount: number;
  totalContractAmount: number;
  showBreakdown: boolean;
  valueLabel: string;
  colors: ColorPalette;
}) {
  const progress = Math.min(elapsedMs / totalMs, 1);
  const isComplete = progress >= 1;
  const isOverBudget = showBreakdown && accumulatedAmount > totalContractAmount && totalContractAmount > 0;
  const filledSweep = ARC_SWEEP * progress;
  const remainingMs = Math.max(totalMs - elapsedMs, 0);
  const arcColor = isOverBudget ? "#e05050" : isComplete ? colors.accent : colors.text;
  const displayAmount = showBreakdown ? accumulatedAmount : totalContractAmount;

  return (
    <View style={{ alignItems: "center", paddingVertical: 24 }}>
      <View style={{ width: 208, height: 212 }}>
        <Svg width={208} height={212} style={{ position: "absolute" }}>
          <Path
            d={buildArcPath(ARC_START, ARC_SWEEP, ARC_R)}
            fill="none"
            stroke={colors.surfaceBorder}
            strokeWidth={9}
            strokeLinecap="round"
          />
          {progress > 0 && (
            <Path
              d={buildArcPath(ARC_START, filledSweep, ARC_R)}
              fill="none"
              stroke={arcColor}
              strokeWidth={9}
              strokeLinecap="round"
            />
          )}
        </Svg>

        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 54,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.2,
              color: colors.textMuted,
              fontFamily: "DMSans_600SemiBold",
              marginBottom: 5,
            }}
          >
            DECORRIDO
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontFamily: "DMMono_400Regular",
              color: colors.text,
              lineHeight: 31,
            }}
          >
            {formatHM(elapsedMs)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "DMSans_400Regular",
              color: colors.textMuted,
              marginTop: 2,
              lineHeight: 16,
            }}
          >
            {`de ${formatHM(totalMs)}`}
          </Text>
          <View
            style={{
              width: 36,
              height: 1,
              backgroundColor: colors.surfaceBorder,
              marginTop: 10,
              marginBottom: 10,
            }}
          />
          <Text
            style={{
              fontSize: 19,
              fontFamily: "DMSans_600SemiBold",
              color: isOverBudget ? "#e05050" : colors.accent,
              lineHeight: 23,
            }}
          >
            {formatCurrency(displayAmount)}
          </Text>
          {showBreakdown && (
            <Text
              style={{
                fontSize: 11,
                fontFamily: "DMSans_400Regular",
                color: colors.textMuted,
                marginTop: 2,
              }}
            >
              {`de ${formatCurrency(totalContractAmount)}`}
            </Text>
          )}
          <Text
            style={{
              fontSize: 10,
              fontFamily: "DMSans_400Regular",
              color: colors.textMuted,
              marginTop: showBreakdown ? 1 : 3,
            }}
          >
            {valueLabel}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 4,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: isOverBudget
            ? "#e0505015"
            : isComplete
            ? colors.accent + "15"
            : colors.surface,
          borderWidth: 1,
          borderColor: isOverBudget
            ? "#e0505035"
            : isComplete
            ? colors.accent + "35"
            : colors.surfaceBorder,
        }}
      >
        <Feather
          name="clock"
          size={12}
          color={isOverBudget ? "#e05050" : isComplete ? colors.accent : colors.textMuted}
        />
        <Text
          style={{
            fontSize: 12,
            fontFamily: "DMSans_600SemiBold",
            color: isOverBudget ? "#e05050" : isComplete ? colors.accent : colors.textSecondary,
            letterSpacing: 0.3,
          }}
        >
          {isOverBudget
            ? "Valor contratado excedido"
            : isComplete
            ? "TEMPO ESGOTADO"
            : `${formatHM(remainingMs)} restante`}
        </Text>
      </View>
    </View>
  );
}

// ─── Free Timer ───────────────────────────────────────────────────────────────

function FreeTimer({
  elapsedMs,
  amount,
  valueLabel,
  colors,
}: {
  elapsedMs: number;
  amount: number;
  valueLabel: string;
  colors: ColorPalette;
}) {
  return (
    <View style={{ paddingVertical: 32, alignItems: "center" }}>
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          color: colors.textMuted,
          fontFamily: "DMSans_600SemiBold",
          marginBottom: 14,
          textTransform: "uppercase",
        }}
      >
        Tempo decorrido
      </Text>
      <Text
        style={{
          fontSize: 52,
          fontFamily: "DMMono_400Regular",
          color: colors.text,
          lineHeight: 56,
          marginBottom: 20,
        }}
      >
        {formatTimerDisplay(elapsedMs)}
      </Text>
      <Text
        style={{
          fontSize: 32,
          fontFamily: "DMSans_600SemiBold",
          color: colors.accent,
          lineHeight: 36,
        }}
      >
        {formatCurrency(amount)}
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontFamily: "DMSans_400Regular",
          color: colors.textMuted,
          marginTop: 4,
        }}
      >
        {valueLabel}
      </Text>
    </View>
  );
}

// ─── Contract Start Row ───────────────────────────────────────────────────────

const DELAY_COLOR = "#c4601a";
const DELAY_BG    = "#fff4ee";

function ContractStartRow({
  scheduledFor,
  isHiring,
  isAccepted,
  colors,
}: {
  scheduledFor?: number;
  isHiring: boolean;
  isAccepted: boolean;
  colors: ColorPalette;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!scheduledFor) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [scheduledFor]);

  const isImmediate = !scheduledFor;
  const diffMs      = scheduledFor ? scheduledFor - Date.now() : null;
  const isFuture    = diffMs !== null && diffMs > 0;
  const isDelayed   = diffMs !== null && diffMs <= 0;

  const formattedDate = scheduledFor ? formatData(scheduledFor) : "";

  const remainingSec = isFuture ? Math.floor(diffMs! / 1000) : 0;
  const isNow        = isFuture && remainingSec <= 5 * 60;
  const isNear       = isFuture && remainingSec <= 30 * 60;

  const futureTone = isNow
    ? { icon: "#18a06b", text: "#18a06b", bg: "#18a06b15" }
    : isNear
    ? { icon: "#ffaa00", text: "#ffaa00", bg: "#ffaa0012" }
    : { icon: colors.textMuted, text: colors.textSecondary, bg: colors.surface };

  const futureTitle    = isNow ? "Iniciando agora" : `Inicia em ${formatCountdown(remainingSec)}`;
  const futureSubtitle = isHiring
    ? "Chegada prevista do profissional"
    : "Horário de início do serviço";

  const delayLabel = isDelayed ? `${formatDelta(Math.abs(diffMs!))} em atraso` : "";

  const handleAddToCalendar = useCallback(async () => {
    if (!scheduledFor) return;
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") return;
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const cal = cals.find((c) => c.allowsModifications) ?? cals[0];
      if (!cal) return;
      await Calendar.createEventAsync(cal.id, {
        title: isHiring ? "Início do serviço contratado" : "Início do serviço",
        startDate: new Date(scheduledFor),
        endDate: new Date(scheduledFor + 3_600_000),
        notes: "Agendado via Khrono",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // silently ignore
    }
  }, [scheduledFor, isHiring]);

  // ── Immediate ──
  if (isImmediate) {
    const immediateSub = isHiring
      ? isAccepted
        ? "O profissional pode iniciar a qualquer momento"
        : "O profissional pode iniciar assim que aceitar"
      : isAccepted
        ? "Toque em iniciar contrato para começar"
        : "Você poderá iniciar assim que aceitar";

    return (
      <View style={[s.detailRow, { borderBottomColor: colors.divider }]}>
        <View style={[s.iconWrap, { backgroundColor: colors.surface }]}>
          <Feather name="zap" size={15} color={colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.detailTitle, { color: colors.text }]}>Início imediato</Text>
          <Text style={[s.detailSub, { color: colors.textMuted }]}>{immediateSub}</Text>
        </View>
      </View>
    );
  }

  // ── Scheduled (future) ──
  if (isFuture) {
    return (
      <View style={[s.detailRow, { borderBottomColor: colors.divider }]}>
        <View style={[s.iconWrap, { backgroundColor: futureTone.bg }]}>
          <Feather name="calendar" size={15} color={futureTone.icon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.detailTitle, { color: futureTone.text }]}>{futureTitle}</Text>
          <Text style={[s.detailSub, { color: colors.textMuted }]}>{futureSubtitle}</Text>
        </View>
        <Pressable
          onPress={handleAddToCalendar}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            backgroundColor: pressed ? colors.surface + "cc" : colors.surface,
          })}
        >
          <Feather name="calendar" size={11} color={colors.textSecondary} />
          <Text
            style={{
              fontFamily: "DMSans_500Medium",
              fontSize: 11,
              color: colors.textSecondary,
            }}
          >
            Agendar
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Delayed (past) ──
  return (
    <View style={[s.detailRow, { borderBottomColor: colors.divider }]}>
      <View style={[s.iconWrap, { backgroundColor: DELAY_BG }]}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="4" width="18" height="18" rx="2" stroke={DELAY_COLOR} strokeWidth="2" />
          <Line x1="16" y1="2" x2="16" y2="6" stroke={DELAY_COLOR} strokeWidth="2" strokeLinecap="round" />
          <Line x1="8" y1="2" x2="8" y2="6" stroke={DELAY_COLOR} strokeWidth="2" strokeLinecap="round" />
          <Line x1="3" y1="10" x2="21" y2="10" stroke={DELAY_COLOR} strokeWidth="2" />
          <Line x1="12" y1="14" x2="12" y2="17" stroke={DELAY_COLOR} strokeWidth="2" strokeLinecap="round" />
          <Line x1="12" y1="19.5" x2="12.01" y2="19.5" stroke={DELAY_COLOR} strokeWidth="2.5" strokeLinecap="round" />
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.detailTitle, { color: colors.text }]}>Início atrasado</Text>
        <Text style={[s.detailSub, { color: colors.textMuted }]}>Era para {formattedDate}</Text>
      </View>
      <View
        style={{
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: 20,
          backgroundColor: DELAY_BG,
          borderWidth: 1,
          borderColor: DELAY_COLOR + "35",
        }}
      >
        <Text
          style={{
            fontFamily: "DMSans_600SemiBold",
            fontSize: 11,
            color: DELAY_COLOR,
            letterSpacing: 0.1,
          }}
        >
          {delayLabel}
        </Text>
      </View>
    </View>
  );
}

// ─── Pontualidade ─────────────────────────────────────────────────────────────

function formatDelta(absDeltaMs: number): string {
  const totalMins = Math.round(absDeltaMs / 60_000);
  if (totalMins < 1)   return "menos de 1 min";
  if (totalMins < 60)  return `${totalMins} min`;
  const totalHrs  = Math.floor(totalMins / 60);
  const remMins   = totalMins % 60;
  if (totalHrs < 24) {
    return remMins > 0 ? `${totalHrs}h ${remMins}min` : `${totalHrs}h`;
  }
  const days    = Math.floor(totalHrs / 24);
  const remHrs  = totalHrs % 24;
  const dayStr  = days === 1 ? "1 dia" : `${days} dias`;
  return remHrs > 0 ? `${dayStr} ${remHrs}h` : dayStr;
}

function getPontualidade(scheduledFor: number, startedAt: number): {
  label: string;
  color: string;
} {
  const deltaMs  = startedAt - scheduledFor;
  const absDelta = Math.abs(deltaMs);

  if (absDelta <= 5 * 60_000) {
    return { label: "No horário", color: "#18a06b" };
  }

  const dur = formatDelta(absDelta);

  if (deltaMs < 0) {
    return { label: `${dur} antes`, color: "#18a06b" };
  }

  const totalMins = Math.round(absDelta / 60_000);
  const color = totalMins <= 15 ? "#ffaa00" : "#e05050";
  return { label: `${dur} atrasado`, color };
}

// ─── DetailRow ────────────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  sub,
  subColor,
  last,
  colors,
  actionIcon,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  last?: boolean;
  colors: ColorPalette;
  actionIcon?: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View>
      <View style={s.detailItemRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <View>
            <Text style={[s.detailLabel, { color: colors.textMuted }]}>
              {label}
            </Text>
            {sub && (
              <Text
                style={[
                  s.detailSub,
                  { color: subColor ?? colors.textMuted, marginTop: 2 },
                ]}
              >
                {sub}
              </Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[s.detailValue, { color: colors.text }]}>{value}</Text>
          {actionIcon && <Feather name={actionIcon} size={14} color={colors.textMuted} />}
        </View>
      </View>
      {!last && <View style={{ height: 1, backgroundColor: colors.divider }} />}
    </View>
  );
}

// ─── Pending Banner ───────────────────────────────────────────────────────────

function PendingBanner({
  icon,
  title,
  reason,
  sub,
  toneColor,
  colors,
}: {
  icon: React.ReactNode;
  title: string;
  reason?: string;
  sub?: string;
  toneColor: string;
  colors: ColorPalette;
}) {
  return (
    <View
      style={[
        s.pendingBanner,
        {
          backgroundColor: toneColor + "12",
          borderColor: toneColor + "35",
        },
      ]}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[s.pendingTitle, { color: toneColor }]}>{title}</Text>
        {reason ? (
          <Text style={[s.pendingReason, { color: colors.textSecondary }]}>
            {reason}
          </Text>
        ) : null}
        {sub ? (
          <Text style={[s.pendingSub, { color: colors.textMuted }]}>{sub}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Help Sheet Content ───────────────────────────────────────────────────────

function HelpSheetContent({
  contract,
  contratoId,
  isRunning,
  isPaused,
  isPending,
  isAccepted,
  isEnded,
  onClose,
  onEnd,
  onCancelRequest,
  onDirectCancel,
  colors,
}: {
  contract: Contract;
  contratoId: string;
  isRunning: boolean;
  isPaused: boolean;
  isPending: boolean;
  isAccepted: boolean;
  isEnded: boolean;
  onClose: () => void;
  onEnd: () => void;
  onCancelRequest: () => void;
  onDirectCancel: () => void;
  colors: ColorPalette;
}) {
  type Action = {
    icon: string;
    label: string;
    desc: string;
    onPress: () => void;
    destructive?: boolean;
  };

  const actions: Action[] = [];

  if (isPending || isAccepted) {
    actions.push({
      icon: "x-circle",
      label: "Cancelar o contrato",
      desc: "Cancelar antes de iniciar sem custo",
      onPress: onDirectCancel,
      destructive: true,
    });
  }
  if (isRunning || isPaused) {
    actions.push({
      icon: "square",
      label: "Encerrar o contrato",
      desc: "Solicitar encerramento com motivo",
      onPress: onEnd,
    });
    actions.push({
      icon: "x-circle",
      label: "Solicitar cancelamento",
      desc: "Cancelar precisa de confirmação da contraparte",
      onPress: onCancelRequest,
      destructive: true,
    });
  }
  actions.push({
    icon: "file-text",
    label: "Ver comprovante do contrato",
    desc: "Detalhes completos para fins de registro",
    onPress: onClose,
  });
  if (isEnded) {
    actions.push({
      icon: "alert-circle",
      label: "Contestar o valor cobrado",
      desc: "Se acredita que houve erro no cálculo do tempo",
      onPress: onClose,
    });
  }

  return (
    <>
      <View style={[s.sheetHeader, { borderBottomColor: colors.divider }]}>
        <View>
          <Text style={[s.sheetTitle, { color: colors.text }]}>
            O que você precisa?
          </Text>
          <Text style={[s.sheetSubtitle, { color: colors.textMuted }]}>
            {contratoId}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10}>
          <Feather name="x" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ gap: 2, paddingTop: 8 }}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            style={({ pressed }) => [
              s.sheetActionRow,
              {
                borderBottomColor: colors.surface,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <View style={[GlobalStyles.iconWrap, { backgroundColor: colors.menuIconBg }]}>
              <Feather
                name={a.icon as any}
                size={17}
                color={colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  s.sheetActionLabel,
                  { color: a.destructive ? "#e05050" : colors.text },
                ]}
              >
                {a.label}
              </Text>
              <Text style={[s.sheetActionDesc, { color: colors.textMuted }]}>
                {a.desc}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={15}
              color={a.destructive ? "#e0505050" : colors.chevron}
            />
          </Pressable>
        ))}
      </View>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ContractDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPendingProvider } = useConfirmation();

  const {
    activeContracts,
    history,
    cancelContract,
    acceptContract,
    rejectContract,
    beginContract,
    requestEndContract,
    confirmEndContract,
    rejectEndRequest,
    requestCancelContract,
    confirmCancelContract,
    rejectCancelRequest,
    confirmCashPayment,
    disputeCashPayment,
  } = useContracts();

  const contract = [...activeContracts, ...history].find((c) => c.id === id);

  const [now, setNow] = useState(Date.now());
  const [notaSelecionada, setNotaSelecionada] = useState(0);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [reasonSheetMode, setReasonSheetMode] = useState<"end" | "cancel" | null>(null);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const loading = loadingAction !== null;
  const showToast = useToast();

  const helpRef = useRef<BottomSheetModal>(null);
  const helpSnapPoints = useMemo(() => ["70%"], []);
  const helpBgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: colors.sheetBorder,
    }),
    [colors]
  );
  const helpHandleStyle = useMemo(
    () => ({ backgroundColor: colors.handleColor, width: 36, height: 4 }),
    [colors]
  );
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  useEffect(() => {
    if (helpOpen) helpRef.current?.present();
    else helpRef.current?.dismiss();
  }, [helpOpen]);

  useEffect(() => {
    if (!contract || !isContractRunning(contract)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [contract?.status, contract?.agendado, contract?.startedAt]);

  const withLoading = async (
    action: string,
    fn: () => Promise<void>,
    opts?: { onSuccess?: string; onError?: string }
  ) => {
    setLoadingAction(action);
    try {
      await fn();
      if (opts?.onSuccess) showToast(opts.onSuccess, "success");
    } catch (e) {
      console.warn("[ContractDetail] error:", e);
      showToast(opts?.onError ?? "Algo deu errado. Tente novamente.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAccept = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading("accept", () => acceptContract(contract.id), {
      onSuccess: "Contrato aceito.",
      onError: "Não foi possível aceitar o contrato.",
    });
  }, [acceptContract, contract?.id]);

  const handleReject = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading("reject", () => rejectContract(contract.id), {
      onSuccess: "Contrato recusado.",
      onError: "Não foi possível recusar o contrato.",
    });
    router.back();
  }, [rejectContract, contract?.id]);

  const handleBegin = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading("begin", () => beginContract(contract.id), {
      onSuccess: "Contrato iniciado.",
      onError: "Não foi possível iniciar o contrato.",
    });
  }, [beginContract, contract?.id]);

  const handleRequestEnd = useCallback(
    async (reason: string) => {
      if (!contract) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await withLoading(
        "requestEnd",
        () => requestEndContract(contract.id, reason),
        {
          onSuccess: "Encerramento solicitado. Aguardando confirmação.",
          onError: "Não foi possível solicitar o encerramento.",
        }
      );
    },
    [requestEndContract, contract?.id]
  );

  const handleConfirmEnd = useCallback(async () => {
    if (!contract) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await withLoading(
      "confirmEnd",
      () => confirmEndContract(contract.id),
      {
        onSuccess: "Contrato encerrado com sucesso.",
        onError: "Não foi possível confirmar o encerramento.",
      }
    );
  }, [confirmEndContract, contract?.id]);

  const handleRejectEnd = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading(
      "rejectEnd",
      () => rejectEndRequest(contract.id),
      {
        onSuccess: "Solicitação de encerramento recusada.",
        onError: "Não foi possível recusar o encerramento.",
      }
    );
  }, [rejectEndRequest, contract?.id]);

  const handleRejectCancel = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading("rejectCancel", () => rejectCancelRequest(contract.id), {
      onSuccess: "Solicitação de cancelamento recusada.",
      onError: "Não foi possível recusar o cancelamento.",
    });
  }, [rejectCancelRequest, contract?.id]);

  const handleRequestCancel = useCallback(
    async (reason: string) => {
      if (!contract) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await withLoading(
        "requestCancel",
        () => requestCancelContract(contract.id, reason),
        {
          onSuccess: "Cancelamento solicitado. Aguardando confirmação.",
          onError: "Não foi possível solicitar o cancelamento.",
        }
      );
      setHelpOpen(false);
    },
    [requestCancelContract, contract?.id]
  );

  const handleConfirmCancel = useCallback(async () => {
    if (!contract) return;
    setConfirmCancelar(false);
    setHelpOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (
      contract.status === "pending_cancel" &&
      contract.cancelRequestedBy !== contract.person.profileId &&
      contract.cancelRequestedBy !== undefined
    ) {
      await withLoading("confirmCancel", () => confirmCancelContract(contract.id), {
        onSuccess: "Contrato cancelado.",
        onError: "Não foi possível confirmar o cancelamento.",
      });
    } else {
      await withLoading("confirmCancel", () => cancelContract(contract.id), {
        onSuccess: "Contrato cancelado.",
        onError: "Não foi possível cancelar o contrato.",
      });
    }
    router.back();
  }, [cancelContract, confirmCancelContract, contract]);

  const handleConfirmCashPayment = useCallback(async () => {
    if (!contract) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await withLoading("confirmCashPayment", () => confirmCashPayment(contract.id), {
      onSuccess:
        contract.role === "hiring"
          ? "Pagamento em dinheiro confirmado."
          : "Recebimento em dinheiro confirmado.",
      onError: "Não foi possível confirmar o pagamento.",
    });
  }, [confirmCashPayment, contract?.id, contract?.role]);

  const handleDisputeCashPayment = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading(
      "disputeCashPayment",
      () => disputeCashPayment(contract.id, "Pagamento em dinheiro contestado pelo usuário."),
      {
        onSuccess: "Disputa de pagamento aberta.",
        onError: "Não foi possível contestar o pagamento.",
      }
    );
  }, [disputeCashPayment, contract?.id]);

  // ── Not found ──
  if (!contract) {
    return (
      <View
        style={[
          s.container,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={GlobalStyles.backButton}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={18} color={colors.iconBack} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text
            style={{ color: colors.textMuted, fontFamily: "DMSans_400Regular", fontSize: 13 }}
          >
            Contrato não encontrado
          </Text>
        </View>
      </View>
    );
  }

  // ── Derived state ──
  const isHiring = contract.role === "hiring";
  const isFixed = contract.tipo === "timer";
  const isRunning = isContractRunning(contract);
  const isActive = contract.status === "active";
  const isPending = contract.status === "pending_signature";
  const isAccepted = contract.status === "accepted";
  const isPaused = contract.status === "paused";
  const isEnded = contract.status === "ended";
  const isDisputed = contract.status === "disputed";
  const isFinalized = isEnded || isDisputed;
  const isCancelled =
    contract.status === "cancelled" || contract.status === "rejected";
  const isPendingEnd = contract.status === "pending_end";
  const isPendingCancel = contract.status === "pending_cancel";
  const isScheduled = isActive && contract.startedAt === 0;

  const iAmRequester =
    (isPendingEnd && contract.endRequestedBy !== contract.person.profileId) ||
    (isPendingCancel && contract.cancelRequestedBy !== contract.person.profileId);
  const iAmConfirmer = !iAmRequester && (isPendingEnd || isPendingCancel);

  // ── Time / money ──
  const elapsedMs = isRunning
    ? now - contract.startedAt
    : (isPendingEnd || isPendingCancel) && contract.startedAt > 0
    ? now - contract.startedAt
    : isFinalized && contract.endedAt && contract.startedAt > 0
    ? contract.endedAt - contract.startedAt
    : isFixed && contract.duracaoTotal && !isPending && !isAccepted && !isCancelled
    ? contract.duracaoTotal
    : 0;

  const totalMs = contract.duracaoTotal ?? 0;
  const isOverdue = isFixed && totalMs > 0 && elapsedMs > totalMs;

  // Valor acumulado até agora (cresce do zero conforme o tempo passa)
  const accumulatedAmount = (elapsedMs / 1000 / 3600) * contract.ratePerHour;
  // Valor total contratado (fixo para contratos de tempo definido, ou acumulado para abertos)
  const totalContractAmount = isFixed && totalMs > 0
    ? (totalMs / 1000 / 3600) * contract.ratePerHour
    : accumulatedAmount;
  // Valor exibido no cabeçalho do card de contexto (sempre o total contratado)
  const amount = totalContractAmount;

  const valueLabel = getValueLabel(contract);

  const showTimer =
    isRunning || isPaused || isPendingEnd || isPendingCancel || isFinalized || isCancelled || isScheduled || isPending || isAccepted;
  const showStartRow =
    (isPending || isAccepted || isScheduled) && !isRunning && !isPendingEnd && !isPendingCancel;

  const contratoId = contract.code || `KRN-${contract.id.slice(-8).toUpperCase()}`;

  // ── Status config ──
  const statusConfig = (() => {
    if (isPendingEnd)
      return { label: "encerramento pendente", color: colors.accent };
    if (isPendingCancel)
      return { label: "cancelamento pendente", color: colors.accent };
    if (isRunning) return { label: "em andamento", color: colors.accent };
    if (isPending) return { label: "aguardando aceite", color: colors.accent };
    if (isAccepted) return { label: "aguardando início", color: colors.accent };
    if (isPaused) return { label: "pausado", color: "#ffaa00" };
    if (isScheduled) return { label: "agendado", color: colors.accent };
    if (isDisputed) return { label: "em disputa", color: "#e05050" };
    if (isEnded) return { label: "encerrado", color: colors.textMuted };
    if (isCancelled)
      return {
        label: contract.status === "rejected" ? "recusado" : "cancelado",
        color: colors.textMuted,
      };
    return { label: "em andamento", color: "#18a06b" };
  })();

  // ── Role theme (mirrors ContractCard) ──
  const t = ROLE_THEME[isHiring ? "hiring" : "hired"];

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: colors.divider }]}>
        <View style={s.headerLeft}>
          <Pressable
            onPress={() => router.back()}
            style={GlobalStyles.backButton}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={16} color={colors.iconBack} />
          </Pressable>

          <Text style={[s.headerId, { color: colors.textMuted }]}>
            {contratoId}
          </Text>
        </View>

        <View
          style={[
            s.statusBadge,
            {
              backgroundColor: statusConfig.color + "15",
              borderColor: statusConfig.color + "35",
            },
          ]}
        >
          <View
            style={[s.statusDot, { backgroundColor: statusConfig.color }]}
          />
          <Text style={[s.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* ── Body ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending banners */}
        {isPendingEnd && (
          <PendingBanner
            icon={<Feather name="flag" size={16} color={colors.accent} />}
            title={
              iAmRequester
                ? "Encerramento solicitado"
                : `${contract.person.name} quer encerrar`
            }
            reason={
              contract.endReason ? `Motivo: ${contract.endReason}` : undefined
            }
            sub={iAmRequester ? "Aguardando confirmação da contraparte" : undefined}
            toneColor={colors.accent}
            colors={colors}
          />
        )}
        {isPendingCancel && (
          <PendingBanner
            icon={<Feather name="x-circle" size={16} color={colors.accent} />}
            title={
              iAmRequester
                ? "Cancelamento solicitado"
                : `${contract.person.name} quer cancelar`
            }
            reason={
              contract.cancelReason
                ? `Motivo: ${contract.cancelReason}`
                : undefined
            }
            sub={iAmRequester ? "Aguardando confirmação da contraparte" : undefined}
            toneColor={colors.accent}
            colors={colors}
          />
        )}

        {/* Context header — aligned with ContractCard */}
        <View
          style={[
            s.contextCard,
            { borderColor: colors.cardBorder },
          ]}
        >
          {/* Header area: relation + amount */}
          <Pressable
            onPress={
              contract.person.profileId
                ? () => router.push(`/user-profile/${contract.person.profileId}` as any)
                : undefined
            }
            style={({ pressed }) => [
              s.contextHeader,
              { backgroundColor: t.headerBg, opacity: pressed && contract.person.profileId ? 0.88 : 1 },
            ]}
          >
            {/* Top row: arrow + relation text */}
            <View style={s.contextHeaderTop}>
              <Feather
                name={isHiring ? "arrow-up-right" : "arrow-down-left"}
                size={13}
                color={t.arrowColor}
              />
              <Text style={[s.contextRelation, { color: t.relationColor }]}>
                {isHiring ? (
                  <>
                    {"Você contratou "}
                    <Text style={[s.contextName, { color: t.nameColor }]}>
                      {contract.person.name}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[s.contextName, { color: t.nameColor }]}>
                      {contract.person.name}
                    </Text>
                    {" contratou você"}
                  </>
                )}
              </Text>
              {contract.person.profileId && (
                <Feather name="chevron-right" size={12} color={t.chevronColor} />
              )}
            </View>
            {/* Bottom row: amount + duration badge */}
            <View style={s.contextHeaderBottom}>
              <Text style={[s.contextAmount, { color: t.amountColor }]}>
                {formatCurrency(amount)}
              </Text>
              <View style={[s.contextBadge, { backgroundColor: t.badgeBg }]}>
                <Feather
                  name={isFixed ? "clock" : "activity"}
                  size={9}
                  color={t.badgeText}
                />
                <Text style={[s.contextBadgeText, { color: t.badgeText }]}>
                  {isFixed && totalMs > 0 ? formatHM(totalMs) : "Aberto"}
                </Text>
              </View>
            </View>
          </Pressable>

        </View>

        {/* Service row */}
        {!!contract.servico?.nome && (
          <ServiceRow servico={contract.servico} colors={colors} />
        )}

        {/* Location row */}
        {!!contract.location && (
          <LocationRow location={contract.location} colors={colors} />
        )}

        {/* Contract start row */}
        {showStartRow && (
          <ContractStartRow
            scheduledFor={contract.scheduledFor}
            isHiring={isHiring}
            isAccepted={isAccepted}
            colors={colors}
          />
        )}

        {/* Time hero */}
        {showTimer && (
          <View
            style={[
              s.timerCard,
              {
                borderBottomColor: colors.divider,
                borderTopColor: colors.divider,
              },
            ]}
          >
            {isFixed ? (
              <ArcProgress
                elapsedMs={elapsedMs}
                totalMs={totalMs}
                accumulatedAmount={accumulatedAmount}
                totalContractAmount={totalContractAmount}
                showBreakdown={contract.startedAt > 0}
                valueLabel={valueLabel}
                colors={colors}
              />
            ) : (
              <FreeTimer
                elapsedMs={elapsedMs}
                amount={accumulatedAmount}
                valueLabel={valueLabel}
                colors={colors}
              />
            )}
          </View>
        )}

        {/* Details card */}
        {(contract.startedAt > 0 || isPending || isAccepted || isCancelled || isFinalized || isScheduled) && (
          <View
            style={[
              s.detailCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <DetailRow
              icon={<Feather name="calendar" size={14} color={colors.textMuted} />}
              label="Programado"
              value={formatData(contract.scheduledFor ?? contract.createdAt)}
              colors={colors}
            />
            {(() => {
              const hasStarted = contract.startedAt > 0;
              const pont =
                hasStarted && !!contract.scheduledFor
                  ? getPontualidade(contract.scheduledFor!, contract.startedAt)
                  : null;
              return (
                <DetailRow
                  icon={<Feather name="clock" size={14} color={colors.textMuted} />}
                  label="Iniciado"
                  value={hasStarted ? formatData(contract.startedAt) : "—"}
                  sub={pont?.label}
                  subColor={pont?.color}
                  colors={colors}
                />
              );
            })()}
            {isFinalized && !!contract.endedAt && (
              <DetailRow
                icon={<Feather name="check-circle" size={14} color={colors.textMuted} />}
                label="Fim"
                value={formatData(contract.endedAt)}
                colors={colors}
              />
            )}
            {isFinalized ? (
              <DetailRow
                icon={
                  <Feather
                    name={isFixed ? "clock" : "activity"}
                    size={14}
                    color={colors.textMuted}
                  />
                }
                label="Executado"
                value={elapsedMs > 0 ? formatHM(elapsedMs) : "—"}
                sub={
                  isFixed && totalMs > 0 && elapsedMs !== totalMs
                    ? `de ${formatHM(totalMs)} contratados`
                    : undefined
                }
                colors={colors}
              />
            ) : (
              <DetailRow
                icon={
                  <Feather
                    name={isFixed ? "clock" : "activity"}
                    size={14}
                    color={colors.textMuted}
                  />
                }
                label="Duração"
                value={
                  isFixed && totalMs > 0 ? formatHM(totalMs) : "Indeterminada"
                }
                colors={colors}
              />
            )}
            {contract.paymentMethod && (() => {
              const ps = getPaymentStatusInfo(
                contract.paymentMethod,
                contract.paymentStatus,
                contract.person.name,
                isHiring,
                isEnded
              );
              const psColor =
                ps.tone === "green" ? "#18a06b"
                : ps.tone === "amber" ? "#ffaa00"
                : ps.tone === "red" ? "#e05050"
                : colors.textMuted;
              const canOpenSheet = !isCancelled;
              return (
                <Pressable
                  onPress={canOpenSheet ? () => setPaymentSheetOpen(true) : undefined}
                  style={({ pressed }) => ({ opacity: pressed && canOpenSheet ? 0.7 : 1 })}
                >
                  <DetailRow
                    icon={
                      <Feather
                        name={paymentIconName(contract.paymentMethod)}
                        size={14}
                        color={colors.textMuted}
                      />
                    }
                    label="Pagamento"
                    value={paymentLabel(contract)}
                    sub={ps.text}
                    subColor={psColor}
                    last={!canOpenSheet}
                    colors={colors}
                    actionIcon={canOpenSheet ? "chevron-right" : undefined}
                  />
                </Pressable>
              );
            })()}
          </View>
        )}

        {/* Comprovante */}
        {(contract.startedAt > 0 || isPending || isAccepted || isCancelled || isFinalized || isScheduled) && (
          <Pressable
            onPress={() => setHelpOpen(true)}
            style={({ pressed }) => [
              s.reHireBtn,
              {
                borderColor: colors.surfaceBorder,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="file-text" size={14} color={colors.textMuted} />
            <Text style={[s.reHireText, { color: colors.textMuted }]}>
              Ver comprovante
            </Text>
          </Pressable>
        )}

        {/* Rating (ended + hiring) */}
        {isEnded && isHiring && contract.paymentStatus !== "disputed" && !avaliacaoEnviada && (
          <View
            style={[
              s.detailCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.accent + "28",
                gap: 12,
              },
            ]}
          >
            <View>
              <Text style={[s.sectionTitle, { color: colors.text }]}>
                Avaliação pendente
              </Text>
              <Text style={[s.sectionSub, { color: colors.textSecondary }]}>
                Como foi sua experiência com {contract.person.name}?
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNotaSelecionada(n);
                  }}
                  hitSlop={4}
                >
                  <Feather
                    name="star"
                    size={28}
                    color={n <= notaSelecionada ? colors.accent : colors.surfaceBorder}
                  />
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={notaSelecionada === 0}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setAvaliacaoEnviada(true);
              }}
              style={[
                s.ratingBtn,
                {
                  backgroundColor:
                    notaSelecionada === 0 ? colors.surface : colors.accent,
                },
              ]}
            >
              <Text
                style={[
                  s.ratingBtnText,
                  { color: notaSelecionada === 0 ? colors.textMuted : "#fff" },
                ]}
              >
                Enviar avaliação
              </Text>
            </Pressable>
          </View>
        )}

        {avaliacaoEnviada && (
          <View
            style={[
              s.detailCard,
              {
                backgroundColor: colors.card,
                borderColor: "#18a06b30",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              },
            ]}
          >
            <Feather name="check-circle" size={16} color="#18a06b" />
            <Text
              style={{ color: "#18a06b", fontSize: 13, fontFamily: "DMSans_600SemiBold" }}
            >
              Avaliação enviada!
            </Text>
          </View>
        )}

        {/* Re-hire — só para quem contratou */}
        {(isFinalized || isCancelled) && isHiring && (
          <Pressable
            onPress={() => {
              const service: ProviderService | undefined = contract.servico
                ? {
                    id: 0,
                    serviceId: contract.servico.serviceId ?? "",
                    nome: contract.servico.nome,
                    hourlyRate: contract.servico.ratePerHour,
                    avaliacoes: contract.servico.avaliacoes ?? 0,
                    nota: contract.servico.nota ?? 0,
                    skill: contract.servico.skill,
                    tools: contract.servico.tools,
                  }
                : undefined;

              const provider: ProviderData = {
                name: contract.person.name,
                initials: contract.person.initials,
                nota: contract.person.nota ?? 0,
                avaliacoes: contract.person.avaliacoes ?? 0,
                distancia: contract.person.distancia ?? 0,
                totalContracts: contract.person.totalContracts,
                profileId: contract.person.profileId,
                services: service ? [service] : [],
              };

              setPendingProvider(provider);
              router.push("/contract-confirm");
            }}
            style={({ pressed }) => [
              s.reHireBtn,
              { borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="rotate-ccw" size={14} color={colors.accent} />
            <Text style={[s.reHireText, { color: colors.accent }]}>
              Contratar novamente
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── Footer ── */}
      {isEnded &&
        contract.paymentMethod === "dinheiro" &&
        contract.paymentStatus !== "paid" &&
        contract.paymentStatus !== "disputed" && (
          <View
            style={[
              s.footer,
              {
                paddingBottom: insets.bottom + 16,
                backgroundColor: colors.background,
                borderTopColor: colors.divider,
              },
            ]}
          >
            <AppButton
              label={isHiring ? "Confirmar pagamento" : "Confirmar recebimento"}
              icon="dollar-sign"
              onPress={() => setPaymentSheetOpen(true)}
              variant="green"
            />
          </View>
        )}

      {!isFinalized && !isCancelled && (
        <View
          style={[
            s.footer,
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: colors.background,
              borderTopColor: colors.divider,
            },
          ]}
        >
          {/* Waiting states */}
          {isPending && isHiring && (
            <View
              style={[
                s.waitingRow,
                {
                  backgroundColor: colors.accent + "08",
                  borderColor: colors.accent + "28",
                },
              ]}
            >
              <Feather name="clock" size={14} color={colors.accent + "88"} />
              <Text style={[s.waitingText, { color: colors.accent + "88" }]}>
                Aguardando aceite do contratado
              </Text>
            </View>
          )}
          {isAccepted && isHiring && (
            <View
              style={[
                s.waitingRow,
                {
                  backgroundColor: colors.accent + "10",
                  borderColor: colors.accent + "30",
                },
              ]}
            >
              <Feather name="clock" size={14} color={colors.accent + "99"} />
              <Text style={[s.waitingText, { color: colors.accent + "99" }]}>
                Aguardando {contract.person.name} iniciar o serviço
              </Text>
            </View>
          )}
          {isPaused && (
            <View
              style={[
                s.waitingRow,
                { backgroundColor: "#ffaa0010", borderColor: "#ffaa0035" },
              ]}
            >
              <Feather name="pause-circle" size={14} color="#ffaa00" />
              <Text style={[s.waitingText, { color: "#ffaa00" }]}>
                Contrato pausado
              </Text>
            </View>
          )}
          {isPendingEnd && iAmRequester && (
            <View
              style={[
                s.waitingRow,
                { backgroundColor: colors.accent + "10", borderColor: colors.accent + "35" },
              ]}
            >
              <Feather name="clock" size={14} color={colors.accent} />
              <Text style={[s.waitingText, { color: colors.accent }]}>
                Aguardando confirmação de encerramento
              </Text>
            </View>
          )}
          {isPendingCancel && iAmRequester && (
            <View
              style={[
                s.waitingRow,
                {
                  backgroundColor: colors.accent + "08",
                  borderColor: colors.accent + "28",
                },
              ]}
            >
              <Feather name="clock" size={14} color={colors.accent + "88"} />
              <Text style={[s.waitingText, { color: colors.accent + "88" }]}>
                Aguardando confirmação de cancelamento
              </Text>
            </View>
          )}

          {/* Action buttons */}
          {isPending && !isHiring && (
            <View style={{ gap: 10 }}>
              <AppButton
                label="aceitar contrato"
                icon="check"
                onPress={handleAccept}
                variant="accent"
                loading={loadingAction === "accept"}
                disabled={loading}
              />
              <AppButton
                label="recusar contrato"
                icon="x"
                onPress={handleReject}
                variant="ghost-red"
                loading={loadingAction === "reject"}
                disabled={loading}
              />
            </View>
          )}
          {isAccepted && !isHiring && (
            <AppButton
              label="iniciar contrato"
              icon="play"
              onPress={handleBegin}
              variant="accent"
              loading={loadingAction === "begin"}
            />
          )}
          {isRunning && (
            <AppButton
              label="encerrar contrato"
              icon="square"
              onPress={() => setReasonSheetMode("end")}
              variant="primary"
              loading={loadingAction === "requestEnd"}
              disabled={loading}
            />
          )}
          {isPendingEnd && iAmConfirmer && (
            <View style={{ gap: 10 }}>
              <AppButton
                label="confirmar encerramento"
                icon="check"
                onPress={handleConfirmEnd}
                variant="primary"
                loading={loadingAction === "confirmEnd"}
                disabled={loading}
              />
              <AppButton
                label="recusar encerramento"
                icon="x"
                onPress={handleRejectEnd}
                variant="ghost-red"
                loading={loadingAction === "rejectEnd"}
                disabled={loading}
              />
            </View>
          )}
          {isPendingCancel && iAmConfirmer && (
            <View style={{ gap: 10 }}>
              <AppButton
                label="confirmar cancelamento"
                icon="check"
                onPress={() => setConfirmCancelar(true)}
                variant="red"
                disabled={loading}
              />
              <AppButton
                label="recusar cancelamento"
                icon="x"
                onPress={handleRejectCancel}
                variant="ghost"
                loading={loadingAction === "rejectCancel"}
                disabled={loading}
              />
            </View>
          )}

          {/* Help link */}
          {!isPendingEnd && !isPendingCancel && (
            <Pressable
              onPress={() => setHelpOpen(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[s.helpLink, { color: colors.textMuted }]}>
                Preciso de ajuda com este contrato
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Help Bottom Sheet ── */}
      <BottomSheetModal
        ref={helpRef}
        snapPoints={helpSnapPoints}
        backgroundStyle={helpBgStyle}
        handleIndicatorStyle={helpHandleStyle}
        backdropComponent={renderBackdrop}
        onDismiss={() => setHelpOpen(false)}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <HelpSheetContent
            contract={contract}
            contratoId={contratoId}
            isRunning={isRunning}
            isPaused={isPaused}
            isPending={isPending}
            isAccepted={isAccepted}
            isEnded={isEnded}
            onClose={() => setHelpOpen(false)}
            onEnd={() => {
              setHelpOpen(false);
              setTimeout(() => setReasonSheetMode("end"), 300);
            }}
            onCancelRequest={() => {
              setHelpOpen(false);
              setTimeout(() => setReasonSheetMode("cancel"), 300);
            }}
            onDirectCancel={() => setConfirmCancelar(true)}
            colors={colors}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* ── Reason Sheet ── */}
      <ReasonSheet
        visible={reasonSheetMode !== null}
        mode={reasonSheetMode ?? "end"}
        onClose={() => setReasonSheetMode(null)}
        onConfirm={(reason) => {
          if (reasonSheetMode === "end") handleRequestEnd(reason);
          else handleRequestCancel(reason);
          setReasonSheetMode(null);
        }}
      />

      {/* ── Cancel Confirm Dialog ── */}
      <AppDialog
        visible={confirmCancelar}
        title={
          isPendingCancel && iAmConfirmer
            ? "Confirmar cancelamento"
            : "Cancelar contrato"
        }
        message={
          isPendingCancel && iAmConfirmer
            ? `${contract.person.name} solicitou cancelar. Motivo: ${contract.cancelReason ?? "não informado"}. Deseja confirmar?`
            : "Tem certeza que deseja cancelar este contrato? Essa ação não pode ser desfeita."
        }
        confirmLabel={
          isPendingCancel && iAmConfirmer ? "Confirmar" : "Sim, cancelar"
        }
        cancelLabel="Voltar"
        onConfirm={handleConfirmCancel}
        onCancel={() => setConfirmCancelar(false)}
        destructive
      />

      {contract && (
        <ContractPaymentSheet
          visible={paymentSheetOpen}
          onClose={() => setPaymentSheetOpen(false)}
          contract={contract}
          isHiring={isHiring}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerId: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 2,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  pendingTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    marginBottom: 3,
  },
  pendingReason: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginBottom: 2,
  },
  pendingSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  // ── context header (mirrors ContractCard) ─────────────────────────────────
  contextCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  contextHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  contextHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  contextRelation: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    flex: 1,
  },
  contextName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  contextHeaderBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  contextAmount: {
    fontFamily: "Sora_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  contextBadgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
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
  detailTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    marginBottom: 2,
  },
  detailSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  timerCard: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 2,
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  detailLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
  },
  detailValue: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    marginBottom: 4,
  },
  sectionSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
  },
  ratingBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  ratingBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  reHireBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  reHireText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    gap: 10,
  },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
  },
  waitingText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  helpLink: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
    paddingVertical: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 18,
    marginBottom: 3,
  },
  sheetSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sheetActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  sheetActionLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  sheetActionDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
});
