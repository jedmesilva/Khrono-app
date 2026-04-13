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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog } from "@/components/AppDialog";
import { ReasonSheet } from "@/components/ReasonSheet";
import {
  Contract,
  isContractRunning,
  useContracts,
} from "@/context/ContractsContext";
import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { formatCurrency } from "@/lib/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHM(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

function formatTimerDisplay(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function formatCountdown(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
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
  if (contract.status === "ended") {
    return contract.role === "hiring" ? "pago" : "recebido";
  }
  return contract.role === "hiring" ? "a pagar" : "a receber";
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
  amount,
  valueLabel,
  colors,
}: {
  elapsedMs: number;
  totalMs: number;
  amount: number;
  valueLabel: string;
  colors: ColorPalette;
}) {
  const progress = Math.min(elapsedMs / totalMs, 1);
  const isComplete = progress >= 1;
  const filledSweep = ARC_SWEEP * progress;
  const remainingMs = Math.max(totalMs - elapsedMs, 0);

  return (
    <View style={{ alignItems: "center", paddingVertical: 24 }}>
      <Svg width={208} height={212}>
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
            stroke={isComplete ? colors.accent : colors.text}
            strokeWidth={9}
            strokeLinecap="round"
          />
        )}

        <SvgText
          x={ARC_CX}
          y={ARC_CY - 26}
          textAnchor="middle"
          fill={colors.textMuted}
          fontSize={10}
          fontFamily="DMSans_600SemiBold"
          letterSpacing={1.2}
        >
          DECORRIDO
        </SvgText>
        <SvgText
          x={ARC_CX}
          y={ARC_CY + 8}
          textAnchor="middle"
          fill={colors.text}
          fontSize={28}
          fontFamily="DMMono_400Regular"
        >
          {formatHM(elapsedMs)}
        </SvgText>
        <SvgText
          x={ARC_CX}
          y={ARC_CY + 28}
          textAnchor="middle"
          fill={colors.textMuted}
          fontSize={13}
          fontFamily="DMSans_400Regular"
        >
          de {formatHM(totalMs)}
        </SvgText>

        <Line
          x1={ARC_CX - 20}
          y1={ARC_CY + 44}
          x2={ARC_CX + 20}
          y2={ARC_CY + 44}
          stroke={colors.surfaceBorder}
          strokeWidth={1}
        />

        <SvgText
          x={ARC_CX}
          y={ARC_CY + 64}
          textAnchor="middle"
          fill={colors.accent}
          fontSize={21}
          fontFamily="DMSans_600SemiBold"
        >
          {formatCurrency(amount)}
        </SvgText>
        <SvgText
          x={ARC_CX}
          y={ARC_CY + 80}
          textAnchor="middle"
          fill={colors.textMuted}
          fontSize={11}
          fontFamily="DMSans_400Regular"
        >
          {valueLabel}
        </SvgText>
      </Svg>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 4,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: isComplete
            ? colors.accent + "15"
            : colors.surface,
          borderWidth: 1,
          borderColor: isComplete
            ? colors.accent + "35"
            : colors.surfaceBorder,
        }}
      >
        <Feather
          name="clock"
          size={12}
          color={isComplete ? colors.accent : colors.textMuted}
        />
        <Text
          style={{
            fontSize: 12,
            fontFamily: "DMSans_600SemiBold",
            color: isComplete ? colors.accent : colors.textSecondary,
            letterSpacing: 0.3,
          }}
        >
          {isComplete ? "TEMPO ESGOTADO" : `${formatHM(remainingMs)} restante`}
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

// ─── Scheduled Row ────────────────────────────────────────────────────────────

function ScheduledRow({
  scheduledFor,
  isHiring,
  colors,
}: {
  scheduledFor: number;
  isHiring: boolean;
  colors: ColorPalette;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((scheduledFor - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(
      () => setRemaining(Math.max(0, Math.floor((scheduledFor - Date.now()) / 1000))),
      1000
    );
    return () => clearInterval(id);
  }, [scheduledFor]);

  const isNow = remaining <= 5 * 60;
  const isNear = remaining <= 30 * 60;

  const tone = isNow
    ? { bg: "#18a06b15", border: "#18a06b35", icon: "#18a06b", text: "#18a06b" }
    : isNear
    ? { bg: "#ffaa0012", border: "#ffaa0035", icon: "#ffaa00", text: "#ffaa00" }
    : { bg: colors.surface, border: colors.surfaceBorder, icon: colors.textMuted, text: colors.textSecondary };

  return (
    <View style={[s.detailRow, { borderBottomColor: colors.divider }]}>
      <View
        style={[
          s.iconWrap,
          { backgroundColor: tone.bg, borderWidth: 1, borderColor: tone.border },
        ]}
      >
        <Feather name="clock" size={15} color={tone.icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.detailTitle, { color: tone.text }]}>
          {isNow ? "Iniciando agora" : `Inicia em ${formatCountdown(remaining)}`}
        </Text>
        <Text style={[s.detailSub, { color: colors.textMuted }]}>
          {isHiring
            ? "Chegada prevista do profissional"
            : "Horário de início do serviço"}
        </Text>
      </View>
      {!isNow && (
        <Text
          style={{
            fontSize: 13,
            fontFamily: "DMMono_400Regular",
            color: isNear ? "#ffaa00" : colors.textMuted,
          }}
        >
          {formatCountdown(remaining)}
        </Text>
      )}
    </View>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  sub,
  subColor,
  last,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  last?: boolean;
  colors: ColorPalette;
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
        <Text style={[s.detailValue, { color: colors.text }]}>{value}</Text>
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
            <View
              style={[
                s.iconWrap,
                {
                  backgroundColor: a.destructive
                    ? "#e0504410"
                    : colors.accent + "12",
                  borderWidth: 1,
                  borderColor: a.destructive
                    ? "#e0504428"
                    : colors.accent + "28",
                },
              ]}
            >
              <Feather
                name={a.icon as any}
                size={17}
                color={a.destructive ? "#e05050" : colors.accent}
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

// ─── Primary CTA ──────────────────────────────────────────────────────────────

function PrimaryButton({
  label,
  onPress,
  variant = "dark",
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "dark" | "green" | "red" | "ghost";
  disabled?: boolean;
}) {
  const bg =
    variant === "green"
      ? "#18a06b"
      : variant === "red"
      ? "#e05050"
      : variant === "ghost"
      ? "transparent"
      : "#2C2A26";

  const textColor =
    variant === "ghost" ? "#9B9487" : "#F2EFE9";

  const borderColor =
    variant === "ghost" ? "#DDD9D1" : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.primaryBtn,
        {
          backgroundColor: disabled ? "#E5E1D9" : bg,
          borderColor,
          borderWidth: variant === "ghost" ? 1 : 0,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[
          s.primaryBtnText,
          { color: disabled ? "#9B9487" : textColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ContractDetailScreen() {
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    activeContracts,
    history,
    cancelContract,
    acceptContract,
    rejectContract,
    beginContract,
    requestEndContract,
    confirmEndContract,
    requestCancelContract,
    confirmCancelContract,
  } = useContracts();

  const contract = [...activeContracts, ...history].find((c) => c.id === id);

  const [now, setNow] = useState(Date.now());
  const [notaSelecionada, setNotaSelecionada] = useState(0);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [reasonSheetMode, setReasonSheetMode] = useState<"end" | "cancel" | null>(null);
  const [loading, setLoading] = useState(false);

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

  const withLoading = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      console.warn("[ContractDetail] error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading(() => acceptContract(contract.id));
  }, [acceptContract, contract?.id]);

  const handleReject = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading(() => rejectContract(contract.id));
    router.back();
  }, [rejectContract, contract?.id]);

  const handleBegin = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading(() => beginContract(contract.id));
  }, [beginContract, contract?.id]);

  const handleRequestEnd = useCallback(
    async (reason: string) => {
      if (!contract) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await withLoading(() => requestEndContract(contract.id, reason));
    },
    [requestEndContract, contract?.id]
  );

  const handleConfirmEnd = useCallback(async () => {
    if (!contract) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await withLoading(() => confirmEndContract(contract.id));
  }, [confirmEndContract, contract?.id]);

  const handleRequestCancel = useCallback(
    async (reason: string) => {
      if (!contract) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await withLoading(() => requestCancelContract(contract.id, reason));
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
      await withLoading(() => confirmCancelContract(contract.id));
    } else {
      await withLoading(() => cancelContract(contract.id));
    }
    router.back();
  }, [cancelContract, confirmCancelContract, contract]);

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
            style={s.headerBtn}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={18} color={colors.text} />
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
  const isCancelled =
    contract.status === "cancelled" || contract.status === "rejected";
  const isPendingEnd = contract.status === "pending_end";
  const isPendingCancel = contract.status === "pending_cancel";
  const isScheduled = isActive && !!contract.agendado;

  const iAmRequester =
    (isPendingEnd && contract.endRequestedBy !== contract.person.profileId) ||
    (isPendingCancel && contract.cancelRequestedBy !== contract.person.profileId);
  const iAmConfirmer = !iAmRequester && (isPendingEnd || isPendingCancel);

  // ── Time / money ──
  const elapsedMs = isRunning
    ? now - contract.startedAt
    : isEnded && contract.endedAt && contract.startedAt > 0
    ? contract.endedAt - contract.startedAt
    : isFixed && contract.duracaoTotal
    ? contract.duracaoTotal
    : 0;

  const totalMs = contract.duracaoTotal ?? 0;
  const amount = isFixed && totalMs > 0
    ? (totalMs / 1000 / 3600) * contract.ratePerHour
    : (elapsedMs / 1000 / 3600) * contract.ratePerHour;

  const valueLabel = getValueLabel(contract);

  const showTimer =
    isRunning || isPaused || isPendingEnd || isEnded || isScheduled;
  const showScheduledRow =
    (isAccepted || isScheduled) && !!contract.scheduledFor;

  const roleLabelText = isHiring
    ? isPending || isAccepted
      ? "Você está contratando"
      : "Você contratou"
    : isRunning || isPaused || isPendingEnd || isPendingCancel
    ? "Você é contratado de"
    : "Você foi contratado por";

  const contratoId = `KRN-${contract.id.slice(-8).toUpperCase()}`;

  // ── Status config ──
  const statusConfig = (() => {
    if (isPendingEnd)
      return { label: "encerramento pendente", color: "#ffaa00" };
    if (isPendingCancel)
      return { label: "cancelamento pendente", color: colors.accent };
    if (isRunning) return { label: "em andamento", color: "#18a06b" };
    if (isPending) return { label: "aguardando aceite", color: colors.accent };
    if (isAccepted) return { label: "aguardando início", color: colors.accent };
    if (isPaused) return { label: "pausado", color: "#ffaa00" };
    if (isScheduled) return { label: "agendado", color: colors.accent };
    if (isEnded) return { label: "encerrado", color: colors.textMuted };
    if (isCancelled)
      return {
        label: contract.status === "rejected" ? "recusado" : "cancelado",
        color: colors.textMuted,
      };
    return { label: "em andamento", color: "#18a06b" };
  })();

  // ── Role banner colors ──
  const roleBg = isHiring
    ? isDark
      ? colors.card
      : "#2C2A26"
    : colors.accent + "12";
  const roleBorder = isHiring ? "transparent" : colors.accent + "28";
  const roleIconBg = isHiring ? "rgba(255,255,255,0.1)" : colors.accent + "25";
  const roleTextLabel = isHiring ? "rgba(255,255,255,0.45)" : colors.accent;
  const roleNameColor = isHiring ? (isDark ? colors.text : "#F2EFE9") : colors.text;
  const roleMeta = isHiring ? "rgba(255,255,255,0.5)" : colors.accent + "cc";

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: colors.divider }]}>
        <Pressable
          onPress={() => router.back()}
          style={[s.headerBtn, { backgroundColor: colors.surface }]}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={16} color={colors.text} />
        </Pressable>

        <Text style={[s.headerId, { color: colors.textMuted }]}>
          {contratoId}
        </Text>

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
            icon={<Feather name="flag" size={16} color="#ffaa00" />}
            title={
              iAmRequester
                ? "Encerramento solicitado"
                : `${contract.person.name} quer encerrar`
            }
            reason={
              contract.endReason ? `Motivo: ${contract.endReason}` : undefined
            }
            sub={iAmRequester ? "Aguardando confirmação da contraparte" : undefined}
            toneColor="#ffaa00"
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

        {/* Role banner */}
        <Pressable
          onPress={
            contract.person.profileId
              ? () => router.push(`/user-profile/${contract.person.profileId}` as any)
              : undefined
          }
          style={({ pressed }) => [
            s.roleBanner,
            {
              backgroundColor: roleBg,
              borderColor: roleBorder,
              opacity: pressed && contract.person.profileId ? 0.8 : 1,
            },
          ]}
        >
          <View style={[s.roleIconWrap, { backgroundColor: roleIconBg }]}>
            <Feather
              name={isHiring ? "arrow-up-right" : "arrow-down-left"}
              size={16}
              color={isHiring ? "rgba(255,255,255,0.7)" : colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.roleLabel, { color: roleTextLabel }]}>
              {roleLabelText}
            </Text>
            <Text style={[s.roleName, { color: roleNameColor }]}>
              {contract.person.name}
            </Text>
            {contract.person.profileId && (
              <Text style={[s.roleViewProfile, { color: roleMeta }]}>
                Ver perfil →
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            {contract.person.distancia != null && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="map-pin" size={11} color={roleMeta} />
                <Text style={[s.roleMeta, { color: roleMeta }]}>
                  {contract.person.distancia} km
                </Text>
              </View>
            )}
            {contract.person.nota != null && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Feather name="star" size={10} color={roleMeta} />
                <Text style={[s.roleMeta, { color: roleMeta }]}>
                  {contract.person.nota}
                  {contract.person.avaliacoes != null
                    ? ` · ${contract.person.avaliacoes} av.`
                    : ""}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* Service row */}
        <View style={[s.detailRow, { borderBottomColor: colors.divider }]}>
          <View style={[s.iconWrap, { backgroundColor: colors.surface }]}>
            <Feather name="briefcase" size={15} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.detailTitle, { color: colors.text }]}>
              {contract.servico?.nome ?? contract.person.skill}
            </Text>
            <Text style={[s.detailSub, { color: colors.textMuted }]}>
              {isFixed && totalMs > 0
                ? `${formatCurrency(amount)} · ${formatHM(totalMs)}`
                : `R$ ${contract.ratePerHour.toLocaleString("pt-BR")}/h`}
            </Text>
          </View>
          <View
            style={[
              s.typePill,
              {
                backgroundColor: isFixed
                  ? "#18a06b15"
                  : colors.surface,
                borderColor: isFixed
                  ? "#18a06b35"
                  : colors.surfaceBorder,
              },
            ]}
          >
            <Feather
              name={isFixed ? "clock" : "activity"}
              size={11}
              color={isFixed ? "#18a06b" : colors.textSecondary}
            />
            <Text
              style={[
                s.typePillText,
                { color: isFixed ? "#18a06b" : colors.textSecondary },
              ]}
            >
              {isFixed ? `${formatHM(totalMs)}` : "Aberto"}
            </Text>
          </View>
        </View>

        {/* Scheduled row */}
        {showScheduledRow && (
          <ScheduledRow
            scheduledFor={contract.scheduledFor!}
            isHiring={isHiring}
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
                amount={amount}
                valueLabel={valueLabel}
                colors={colors}
              />
            ) : (
              <FreeTimer
                elapsedMs={elapsedMs}
                amount={amount}
                valueLabel={valueLabel}
                colors={colors}
              />
            )}
          </View>
        )}

        {/* Details card */}
        {(contract.startedAt > 0 || isPending || isAccepted) && (
          <View
            style={[
              s.detailCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {contract.startedAt > 0 && (
              <DetailRow
                icon={<Feather name="clock" size={14} color={colors.textMuted} />}
                label="Início"
                value={formatData(contract.startedAt)}
                colors={colors}
              />
            )}
            {isEnded && !!contract.endedAt && (
              <DetailRow
                icon={<Feather name="check-circle" size={14} color={colors.textMuted} />}
                label="Conclusão"
                value={formatData(contract.endedAt)}
                colors={colors}
              />
            )}
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
              return (
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
                  last
                  colors={colors}
                />
              );
            })()}
          </View>
        )}

        {/* Rating (ended + hiring) */}
        {isEnded && isHiring && !avaliacaoEnviada && (
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

        {/* Re-hire */}
        {(isEnded || isCancelled) && (
          <Pressable
            onPress={() => router.back()}
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
      {!isEnded && !isCancelled && (
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
                { backgroundColor: "#ffaa0010", borderColor: "#ffaa0035" },
              ]}
            >
              <Feather name="clock" size={14} color="#ffaa00" />
              <Text style={[s.waitingText, { color: "#ffaa00" }]}>
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
              <PrimaryButton
                label="✓  aceitar contrato"
                onPress={handleAccept}
                variant="green"
                disabled={loading}
              />
              <PrimaryButton
                label="✕  recusar contrato"
                onPress={handleReject}
                variant="red"
                disabled={loading}
              />
            </View>
          )}
          {isAccepted && !isHiring && (
            <PrimaryButton
              label="▶  iniciar contrato"
              onPress={handleBegin}
              variant="dark"
              disabled={loading}
            />
          )}
          {isRunning && (
            <PrimaryButton
              label="■  encerrar contrato"
              onPress={() => setReasonSheetMode("end")}
              variant="dark"
              disabled={loading}
            />
          )}
          {isPendingEnd && iAmConfirmer && (
            <PrimaryButton
              label="✓  confirmar encerramento"
              onPress={handleConfirmEnd}
              variant="green"
              disabled={loading}
            />
          )}
          {isPendingCancel && iAmConfirmer && (
            <PrimaryButton
              label="✓  confirmar cancelamento"
              onPress={() => setConfirmCancelar(true)}
              variant="red"
              disabled={loading}
            />
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
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
  roleBanner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 2,
  },
  roleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  roleLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  roleName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
  roleMeta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  roleViewProfile: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.1,
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
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  typePillText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase",
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
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.3,
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
