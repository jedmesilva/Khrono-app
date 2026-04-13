import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog } from "@/components/AppDialog";
import { ReasonSheet } from "@/components/ReasonSheet";
import { useTheme } from "@/context/ThemeContext";
import { Contract, useContracts, isContractRunning } from "@/context/ContractsContext";

type SheetActionRowProps = {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onPress: () => void;
  colors: any;
  destructive?: boolean;
};

function SheetActionRow({
  icon,
  label,
  desc,
  onPress,
  colors,
  destructive,
}: SheetActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingVertical: 13,
          paddingHorizontal: 4,
          borderBottomWidth: 1,
          borderBottomColor: colors.surface,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          backgroundColor: destructive ? "#ff444410" : "#e0603012",
          borderColor: destructive ? "#ff444425" : "#e0603025",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Sora_600SemiBold",
            color: destructive ? "#e05050" : colors.text,
            marginBottom: 2,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_400Regular",
            color: colors.textSecondary,
            lineHeight: 15,
          }}
        >
          {desc}
        </Text>
      </View>
      <Feather
        name="chevron-right"
        size={15}
        color={destructive ? "#e0505060" : colors.chevron}
      />
    </Pressable>
  );
}

function getDetailValueLabel(contract: Contract): string {
  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const isCash = contract.paymentMethod === "dinheiro";
  const isCardOrPix =
    contract.paymentMethod === "cartao" || contract.paymentMethod === "pix";

  if (contract.status === "ended") {
    return isHiring ? "pago" : "recebido";
  }

  if (
    contract.status === "pending_signature" ||
    contract.status === "accepted" ||
    contract.status === "paused" ||
    contract.status === "pending_end" ||
    contract.status === "pending_cancel"
  ) {
    return isHiring ? "a pagar" : "a receber";
  }

  if (isHiring) {
    if (isCash) return "a pagar";
    if (isCardOrPix && isTimer) return "pagando";
    if (isCardOrPix && !isTimer) return "a pagar";
    return "pagando";
  } else {
    if (isCash) return "a receber";
    if (isCardOrPix) return "recebendo";
    return "recebendo";
  }
}

function formatTimer(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatData(ts: number) {
  const d = new Date(ts);
  const dia = String(d.getDate()).padStart(2, "0");
  const meses = [
    "jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez",
  ];
  const mes = meses[d.getMonth()];
  const ano = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia} ${mes} ${ano} às ${h}:${min}`;
}

export default function ContractDetailScreen() {
  const { colors } = useTheme();
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
  const [suporteAberto, setSuporteAberto] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [reasonSheetMode, setReasonSheetMode] = useState<"end" | "cancel" | null>(null);
  const [loading, setLoading] = useState(false);

  const suporteRef = useRef<BottomSheetModal>(null);
  const suporteSnapPoints = useMemo(() => ["85%"], []);
  const suporteSheetBg = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: colors.sheetBorder,
    }),
    [colors]
  );
  const suporteHandleStyle = useMemo(
    () => ({ backgroundColor: colors.handleColor, width: 36, height: 4 }),
    [colors]
  );
  const renderSuporteBackdrop = useCallback(
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
    if (suporteAberto) {
      suporteRef.current?.present();
    } else {
      suporteRef.current?.dismiss();
    }
  }, [suporteAberto]);

  useEffect(() => {
    if (!contract || !isContractRunning(contract)) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
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

  const handleAcceptContract = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading(() => acceptContract(contract.id));
  }, [acceptContract, contract?.id]);

  const handleRejectContract = useCallback(async () => {
    if (!contract) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await withLoading(() => rejectContract(contract.id));
    router.back();
  }, [rejectContract, contract?.id]);

  const handleBeginContract = useCallback(async () => {
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
      setSuporteAberto(false);
    },
    [requestCancelContract, contract?.id]
  );

  const handleConfirmCancelamento = useCallback(async () => {
    if (!contract) return;
    setConfirmCancelar(false);
    setSuporteAberto(false);
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
  }, [
    cancelContract,
    confirmCancelContract,
    contract,
  ]);

  if (!contract) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={20} color="#e06030" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            K<Text style={{ color: "#e06030" }}>r</Text>ono
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: "DMSans_400Regular",
              fontSize: 12,
            }}
          >
            Contrato não encontrado
          </Text>
        </View>
      </View>
    );
  }

  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const isActive = contract.status === "active";
  const isPending = contract.status === "pending_signature";
  const isAccepted = contract.status === "accepted";
  const isPaused = contract.status === "paused";
  const isEnded = contract.status === "ended";
  const isCancelled =
    contract.status === "cancelled" || contract.status === "rejected";
  const isPendingEnd = contract.status === "pending_end";
  const isPendingCancel = contract.status === "pending_cancel";
  const isRunning = isContractRunning(contract);
  const isScheduled = isActive && !!contract.agendado;
  const cor = colors.accent;

  const elapsed = isRunning
    ? now - contract.startedAt
    : isEnded && contract.endedAt && contract.startedAt > 0
    ? contract.endedAt - contract.startedAt
    : 0;

  const valorHora = contract.ratePerHour;
  const valorAcumulado =
    isTimer && contract.duracaoTotal
      ? ((contract.duracaoTotal / 1000 / 3600) * valorHora).toFixed(2)
      : ((elapsed / 1000 / 3600) * valorHora).toFixed(2);

  const restante =
    isTimer && isRunning && contract.duracaoTotal
      ? Math.max(0, contract.duracaoTotal - elapsed)
      : null;
  const progresso =
    isTimer && isRunning && contract.duracaoTotal
      ? Math.min(1, elapsed / contract.duracaoTotal)
      : null;

  const statusLabel = isPending
    ? "aguardando aceite"
    : isAccepted
    ? "aguardando início"
    : isPaused
    ? "pausado"
    : isPendingEnd
    ? "encerramento pendente"
    : isPendingCancel
    ? "cancelamento pendente"
    : isScheduled
    ? "agendado"
    : isRunning
    ? "em andamento"
    : isEnded
    ? "encerrado"
    : isCancelled
    ? contract.status === "rejected"
      ? "recusado"
      : "cancelado"
    : "em andamento";

  const contratoId = `KRN-${contract.id.slice(-8).toUpperCase()}`;

  // Determina se o usuário atual é quem solicitou a ação pendente
  // Note: endRequestedBy/cancelRequestedBy are user IDs, person.profileId is the OTHER user's ID
  const iAmRequester =
    (isPendingEnd && contract.endRequestedBy !== contract.person.profileId) ||
    (isPendingCancel &&
      contract.cancelRequestedBy !== contract.person.profileId);
  const iAmConfirmer = !iAmRequester && (isPendingEnd || isPendingCancel);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.header, { justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={20} color="#e06030" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            K<Text style={{ color: "#e06030" }}>r</Text>ono
          </Text>
        </View>
        <Pressable
          onPress={() => router.replace("/(tabs)" as any)}
          style={styles.homeBtn}
          hitSlop={12}
        >
          <Feather name="home" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status badge + ID */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              isPendingEnd
                ? { backgroundColor: "#ffaa0015", borderColor: "#ffaa0030" }
                : isPendingCancel
                ? { backgroundColor: "#e0603010", borderColor: "#e0603025" }
                : isRunning
                ? { backgroundColor: "#18a06b15", borderColor: "#18a06b30" }
                : isPending || isAccepted
                ? { backgroundColor: "#e0603010", borderColor: "#e0603025" }
                : {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isPendingEnd
                    ? "#ffaa00"
                    : isPendingCancel
                    ? "#e06030"
                    : isRunning
                    ? "#18a06b"
                    : isPending || isAccepted
                    ? cor
                    : isPaused
                    ? "#ffaa00"
                    : colors.textMuted,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: isPendingEnd
                    ? "#ffaa00"
                    : isPendingCancel
                    ? "#e06030"
                    : isRunning
                    ? "#18a06b"
                    : isPending || isAccepted
                    ? cor
                    : isPaused
                    ? "#ffaa00"
                    : colors.textSecondary,
                },
              ]}
            >
              {statusLabel}
            </Text>
          </View>
          <Text style={[styles.contratoId, { color: colors.textMuted }]}>
            {contratoId}
          </Text>
        </View>

        {/* Banner de encerramento pendente */}
        {isPendingEnd && (
          <View
            style={[
              styles.pendingBanner,
              { backgroundColor: "#ffaa0012", borderColor: "#ffaa0030" },
            ]}
          >
            <Feather name="flag" size={16} color="#ffaa00" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pendingBannerTitle, { color: "#ffaa00" }]}>
                {iAmRequester
                  ? "Encerramento solicitado"
                  : `${contract.person.name} quer encerrar`}
              </Text>
              {contract.endReason ? (
                <Text
                  style={[
                    styles.pendingBannerReason,
                    { color: colors.textSecondary },
                  ]}
                >
                  Motivo: {contract.endReason}
                </Text>
              ) : null}
              {iAmRequester ? (
                <Text
                  style={[
                    styles.pendingBannerSub,
                    { color: colors.textMuted },
                  ]}
                >
                  Aguardando confirmação da contraparte
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Banner de cancelamento pendente */}
        {isPendingCancel && (
          <View
            style={[
              styles.pendingBanner,
              { backgroundColor: "#e0603010", borderColor: "#e0603030" },
            ]}
          >
            <Feather name="x-circle" size={16} color="#e06030" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pendingBannerTitle, { color: "#e06030" }]}>
                {iAmRequester
                  ? "Cancelamento solicitado"
                  : `${contract.person.name} quer cancelar`}
              </Text>
              {contract.cancelReason ? (
                <Text
                  style={[
                    styles.pendingBannerReason,
                    { color: colors.textSecondary },
                  ]}
                >
                  Motivo: {contract.cancelReason}
                </Text>
              ) : null}
              {iAmRequester ? (
                <Text
                  style={[
                    styles.pendingBannerSub,
                    { color: colors.textMuted },
                  ]}
                >
                  Aguardando confirmação da contraparte
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Pessoa */}
        <Text
          style={[
            styles.cardSectionLabel,
            { color: colors.textMuted, marginBottom: 10 },
          ]}
        >
          {isHiring ? "você contratou:" : "você foi contratado por:"}
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              marginBottom: 12,
            },
          ]}
        >
          <View style={styles.pessoaRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: cor + "20", borderColor: cor + "40" },
              ]}
            >
              <Text style={[styles.avatarText, { color: cor }]}>
                {contract.person.initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pessoaNome, { color: colors.text }]}>
                {contract.person.name}
              </Text>
              <View style={styles.infoChipsRow}>
                {contract.person.totalContracts != null && (
                  <View style={styles.infoChip}>
                    <Feather
                      name="briefcase"
                      size={10}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.infoChipText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {contract.person.totalContracts} contratos
                    </Text>
                  </View>
                )}
                {contract.person.distancia != null && (
                  <View style={styles.infoChip}>
                    <Feather
                      name="map-pin"
                      size={10}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.infoChipText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {contract.person.distancia} km
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          {contract.person.profileId && (
            <Pressable
              onPress={() =>
                router.push(
                  `/user-profile/${contract.person.profileId}` as any
                )
              }
              style={[
                styles.verPerfilBtn,
                { borderTopColor: colors.surface },
              ]}
            >
              <Feather name="user" size={11} color={"#e0603099"} />
              <Text style={styles.verPerfilText}>ver perfil completo</Text>
              <Feather name="chevron-right" size={11} color={"#e0603060"} />
            </Pressable>
          )}
        </View>

        {/* Cronômetro / Timer */}
        {(isRunning || isEnded || isScheduled || isPendingEnd) && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: cor + "20",
                alignItems: "center",
                marginBottom: 12,
              },
            ]}
          >
            {isTimer ? (
              <>
                <Text style={[styles.timerLabel, { color: colors.textMuted }]}>
                  tempo restante
                </Text>
                <Text
                  style={[
                    styles.timerValue,
                    { color: colors.text },
                    isRunning &&
                      (restante ?? 0) < 600000 && { color: "#ff4444" },
                  ]}
                >
                  {formatTimer(
                    Math.floor(
                      (restante ?? contract.duracaoTotal ?? 0) / 1000
                    )
                  )}
                </Text>
                <View
                  style={[
                    styles.progressBarWrap,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round((progresso ?? 0) * 100)}%` as any,
                        backgroundColor:
                          isRunning && (restante ?? 0) < 600000
                            ? "#ff4444"
                            : cor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.timerAmount, { color: cor }]}>
                  R${valorAcumulado}
                </Text>
                <Text
                  style={[
                    styles.timerAmountLabel,
                    { color: colors.textMuted },
                  ]}
                >
                  {getDetailValueLabel(contract)}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.timerLabel, { color: colors.textMuted }]}>
                  {isEnded ? "tempo decorrido" : "tempo decorrido"}
                </Text>
                <Text style={[styles.timerValue, { color: colors.text }]}>
                  {formatTimer(Math.floor(elapsed / 1000))}
                </Text>
                <Text
                  style={[
                    styles.timerAmount,
                    {
                      color: isRunning || isPendingEnd ? cor : colors.textSecondary,
                    },
                  ]}
                >
                  {isRunning || isEnded || isPendingEnd
                    ? `R$${valorAcumulado}`
                    : "—"}
                </Text>
                <Text
                  style={[
                    styles.timerAmountLabel,
                    { color: colors.textMuted },
                  ]}
                >
                  {getDetailValueLabel(contract)}
                </Text>
              </>
            )}
            {isScheduled && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                <Feather name="calendar" size={11} color={cor + "80"} />
                <Text
                  style={{
                    fontFamily: "DMSans_400Regular",
                    fontSize: 11,
                    color: cor + "99",
                  }}
                >
                  {contract.agendadoLabel
                    ? `Inicia em ${contract.agendadoLabel}`
                    : "Agendado"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Serviço */}
        {contract.servico && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                marginBottom: 12,
              },
            ]}
          >
            <Text
              style={[styles.cardSectionLabel, { color: colors.textMuted }]}
            >
              serviço contratado
            </Text>
            <View style={{ gap: 10 }}>
              <View style={styles.servicoRow}>
                <View
                  style={[
                    styles.servicoIconWrap,
                    {
                      backgroundColor: cor + "15",
                      borderColor: cor + "30",
                    },
                  ]}
                >
                  <Feather name="briefcase" size={14} color={cor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.servicoNome, { color: colors.text }]}>
                    {contract.servico.nome}
                  </Text>
                  {contract.servico.nota != null && (
                    <View style={styles.servicoMeta}>
                      <Feather name="star" size={10} color="#e06030" />
                      <Text
                        style={[
                          styles.servicoMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {contract.servico.nota} · {contract.servico.avaliacoes}{" "}
                        avaliações
                      </Text>
                    </View>
                  )}
                  {contract.servico.skill && (
                    <View style={styles.servicoMeta}>
                      <Feather name="tool" size={9} color="#e0603099" />
                      <Text
                        style={[
                          styles.servicoMetaText,
                          { color: "#e0603099" },
                        ]}
                      >
                        {contract.servico.skill}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.servicoRate, { color: cor }]}>
                  R${contract.servico.ratePerHour.toFixed(0)}/h
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Detalhes */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              marginBottom: 12,
            },
          ]}
        >
          <Text style={[styles.cardSectionLabel, { color: colors.textMuted }]}>
            detalhes
          </Text>
          <View style={{ gap: 12 }}>
            {[
              {
                label: "Tipo",
                valor: isTimer ? "Tempo definido" : "Tempo em aberto",
                corValor: undefined,
              },
              ...(!contract.servico
                ? [
                    {
                      label: "Valor/hora",
                      valor: `R$${valorHora.toFixed(0)}/h`,
                      corValor: cor,
                    },
                  ]
                : []),
              {
                label: "Execução definida para",
                valor:
                  contract.agendado && contract.agendadoLabel
                    ? contract.agendadoLabel
                    : "Agora",
                corValor: undefined,
              },
              ...(!isActive
                ? [
                    {
                      label: "Duração",
                      valor: formatTimer(Math.floor(elapsed / 1000)),
                      corValor: undefined,
                    },
                    {
                      label: "Valor",
                      valor: `R$${valorAcumulado}`,
                      corValor: cor,
                    },
                  ]
                : []),
              ...(contract.startedAt > 0
                ? [
                    {
                      label: "Iniciado em",
                      valor: formatData(contract.startedAt),
                      corValor: undefined,
                    },
                  ]
                : []),
              ...(contract.endedAt
                ? [
                    {
                      label: "Encerrado em",
                      valor: formatData(contract.endedAt),
                      corValor: undefined,
                    },
                  ]
                : []),
              ...(contract.endReason
                ? [
                    {
                      label: "Motivo encerramento",
                      valor: contract.endReason,
                      corValor: undefined,
                    },
                  ]
                : []),
              ...(contract.cancelReason
                ? [
                    {
                      label: "Motivo cancelamento",
                      valor: contract.cancelReason,
                      corValor: undefined,
                    },
                  ]
                : []),
            ].map((item, i) => (
              <View
                key={i}
                style={[
                  styles.linhaRow,
                  { borderBottomColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.linhaLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.linhaValor,
                    { color: item.corValor ?? colors.text },
                  ]}
                >
                  {item.valor}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pagamento */}
        {contract.paymentMethod && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                marginBottom: 12,
              },
            ]}
          >
            <Text
              style={[styles.cardSectionLabel, { color: colors.textMuted }]}
            >
              forma de pagamento
            </Text>
            <View style={styles.pagamentoRow}>
              <View
                style={[
                  styles.pagamentoIconWrap,
                  { borderColor: "#e0603040" },
                ]}
              >
                <Feather
                  name={
                    contract.paymentMethod === "cartao"
                      ? "credit-card"
                      : contract.paymentMethod === "pix"
                      ? "zap"
                      : "dollar-sign"
                  }
                  size={15}
                  color="#e06030"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pagamentoLabel, { color: colors.text }]}>
                  {contract.paymentMethod === "cartao"
                    ? contract.paymentCardLabel ?? "Cartão"
                    : contract.paymentMethod === "pix"
                    ? "Pix"
                    : "Dinheiro"}
                </Text>
                <Text
                  style={[
                    styles.pagamentoSub,
                    { color: colors.textMuted },
                  ]}
                >
                  {contract.paymentMethod === "cartao"
                    ? "cartão de crédito/débito"
                    : contract.paymentMethod === "pix"
                    ? "QR Code / chave Pix"
                    : "pago direto ao contratado"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Avaliação */}
        {isEnded && isHiring && !avaliacaoEnviada && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: "#e0603030",
                marginBottom: 12,
              },
            ]}
          >
            <Text style={styles.avaliacaoTitulo}>Avaliação pendente</Text>
            <Text
              style={[
                styles.avaliacaoSub,
                { color: colors.textSecondary },
              ]}
            >
              Como foi sua experiência com {contract.person.name}?
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNotaSelecionada(n);
                  }}
                  hitSlop={4}
                >
                  <MaterialCommunityIcons
                    name={n <= notaSelecionada ? "star" : "star-outline"}
                    size={32}
                    color="#e06030"
                  />
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={notaSelecionada === 0}
              onPress={() => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                setAvaliacaoEnviada(true);
              }}
              style={[
                styles.avaliacaoBtn,
                notaSelecionada === 0 && { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.avaliacaoBtnText,
                  notaSelecionada === 0 && { color: colors.textMuted },
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
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: "#e0603030",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              },
            ]}
          >
            <Feather name="check-circle" size={16} color="#18a06b" />
            <Text
              style={{
                color: "#18a06b",
                fontSize: 13,
                fontFamily: "Sora_600SemiBold",
              }}
            >
              Avaliação enviada!
            </Text>
          </View>
        )}

        {/* ── AÇÕES PRINCIPAIS ─────────────────────────────────────────────── */}

        {/* Aguardando aceite (quem criou) */}
        {isPending && isHiring && (
          <View
            style={[
              styles.encerrarBtn,
              {
                borderColor: cor + "25",
                backgroundColor: cor + "08",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              },
            ]}
          >
            <Feather name="clock" size={13} color={cor + "99"} />
            <Text
              style={[
                styles.encerrarBtnText,
                { color: cor + "99", letterSpacing: 0.5 },
              ]}
            >
              Aguardando aceite do contratado
            </Text>
          </View>
        )}

        {/* Aceitar / Recusar (quem foi contratado) */}
        {isPending && !isHiring && (
          <View style={{ gap: 10 }}>
            <Pressable
              style={[
                styles.encerrarBtn,
                { backgroundColor: "#18a06b", borderColor: "#18a06b" },
              ]}
              onPress={handleAcceptContract}
              disabled={loading}
            >
              <Text style={[styles.encerrarBtnText, { color: "#fff" }]}>
                ✓  aceitar contrato
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.encerrarBtn,
                { borderColor: "#e0505040", backgroundColor: "#e0505008" },
              ]}
              onPress={handleRejectContract}
              disabled={loading}
            >
              <Text
                style={[styles.encerrarBtnText, { color: "#e05050" }]}
              >
                ✕  recusar contrato
              </Text>
            </Pressable>
          </View>
        )}

        {/* Iniciar contrato */}
        {isAccepted && (
          <Pressable
            style={[
              styles.encerrarBtn,
              { backgroundColor: cor, borderColor: cor },
            ]}
            onPress={handleBeginContract}
            disabled={loading}
          >
            <Text style={[styles.encerrarBtnText, { color: "#fff" }]}>
              ▶  iniciar contrato
            </Text>
          </Pressable>
        )}

        {/* Pausado */}
        {isPaused && (
          <View
            style={[
              styles.encerrarBtn,
              {
                borderColor: "#ffaa0040",
                backgroundColor: "#ffaa0008",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              },
            ]}
          >
            <Feather name="pause-circle" size={13} color="#ffaa00" />
            <Text style={[styles.encerrarBtnText, { color: "#ffaa00" }]}>
              Contrato pausado
            </Text>
          </View>
        )}

        {/* Encerrar — quando em andamento */}
        {isRunning && (
          <Pressable
            onPress={() => setReasonSheetMode("end")}
            style={[styles.encerrarBtn, { borderColor: "#e0603040" }]}
            disabled={loading}
          >
            <Text style={styles.encerrarBtnText}>■  encerrar contrato</Text>
          </Pressable>
        )}

        {/* Confirmar encerramento (quem precisa confirmar) */}
        {isPendingEnd && iAmConfirmer && (
          <View style={{ gap: 10 }}>
            <Pressable
              style={[
                styles.encerrarBtn,
                { backgroundColor: "#18a06b", borderColor: "#18a06b" },
              ]}
              onPress={handleConfirmEnd}
              disabled={loading}
            >
              <Text style={[styles.encerrarBtnText, { color: "#fff" }]}>
                ✓  confirmar encerramento
              </Text>
            </Pressable>
            <Text
              style={[
                styles.pendingNote,
                { color: colors.textMuted },
              ]}
            >
              {contract.endReason
                ? `Motivo: ${contract.endReason}`
                : "Nenhum motivo informado"}
            </Text>
          </View>
        )}

        {/* Aguardando confirmação de encerramento (quem pediu) */}
        {isPendingEnd && iAmRequester && (
          <View
            style={[
              styles.encerrarBtn,
              {
                borderColor: "#ffaa0040",
                backgroundColor: "#ffaa0008",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              },
            ]}
          >
            <Feather name="clock" size={13} color="#ffaa00" />
            <Text style={[styles.encerrarBtnText, { color: "#ffaa00" }]}>
              Aguardando confirmação de encerramento
            </Text>
          </View>
        )}

        {/* Confirmar cancelamento (quem precisa confirmar) */}
        {isPendingCancel && iAmConfirmer && (
          <View style={{ gap: 10 }}>
            <Pressable
              style={[
                styles.encerrarBtn,
                { backgroundColor: "#e05050", borderColor: "#e05050" },
              ]}
              onPress={() => setConfirmCancelar(true)}
              disabled={loading}
            >
              <Text style={[styles.encerrarBtnText, { color: "#fff" }]}>
                ✓  confirmar cancelamento
              </Text>
            </Pressable>
            <Text
              style={[styles.pendingNote, { color: colors.textMuted }]}
            >
              {contract.cancelReason
                ? `Motivo: ${contract.cancelReason}`
                : "Nenhum motivo informado"}
            </Text>
          </View>
        )}

        {/* Aguardando confirmação de cancelamento (quem pediu) */}
        {isPendingCancel && iAmRequester && (
          <View
            style={[
              styles.encerrarBtn,
              {
                borderColor: "#e0603040",
                backgroundColor: "#e0603008",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              },
            ]}
          >
            <Feather name="clock" size={13} color="#e06030" />
            <Text style={[styles.encerrarBtnText, { color: "#e06030" }]}>
              Aguardando confirmação de cancelamento
            </Text>
          </View>
        )}

        {/* Contratar novamente */}
        {(isEnded || isCancelled) && (
          <Pressable
            onPress={() => router.back()}
            style={styles.contratarNovBtn}
          >
            <Feather name="rotate-ccw" size={15} color="#e06030" />
            <Text style={styles.contratarNovText}>Contratar novamente</Text>
          </Pressable>
        )}

        {!isEnded && !isCancelled && !isPendingEnd && !isPendingCancel && (
          <Pressable
            onPress={() => setSuporteAberto(true)}
            style={[styles.suporteBtn, { borderColor: colors.surface }]}
          >
            <Feather name="help-circle" size={15} color={colors.textMuted} />
            <Text
              style={[
                styles.suporteBtnText,
                { color: colors.textMuted },
              ]}
            >
              Preciso de ajuda com este contrato
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Support Sheet */}
      <BottomSheetModal
        ref={suporteRef}
        snapPoints={suporteSnapPoints}
        backgroundStyle={suporteSheetBg}
        handleIndicatorStyle={suporteHandleStyle}
        backdropComponent={renderSuporteBackdrop}
        onDismiss={() => setSuporteAberto(false)}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 4,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                O que você precisa?
              </Text>
              <Text
                style={[styles.sheetSubtitle, { color: colors.textMuted }]}
              >
                {contratoId}
              </Text>
            </View>
            <Pressable onPress={() => setSuporteAberto(false)} hitSlop={8}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={{ gap: 2, marginBottom: 20 }}>
            {/* Cancelar antes de iniciar */}
            {(isPending || isAccepted) && (
              <SheetActionRow
                icon={<Feather name="x-circle" size={18} color="#e06030" />}
                label="Cancelar o contrato"
                desc="Cancelar antes de iniciar sem custo"
                onPress={() => setConfirmCancelar(true)}
                colors={colors}
                destructive
              />
            )}

            {/* Encerrar quando em andamento */}
            {(isRunning || isPaused) && (
              <SheetActionRow
                icon={<Feather name="square" size={18} color="#e06030" />}
                label="Encerrar o contrato"
                desc="Solicitar encerramento com motivo"
                onPress={() => {
                  setSuporteAberto(false);
                  setTimeout(() => setReasonSheetMode("end"), 300);
                }}
                colors={colors}
              />
            )}

            {/* Solicitar cancelamento quando em andamento */}
            {isRunning && (
              <SheetActionRow
                icon={<Feather name="x-circle" size={18} color="#e06030" />}
                label="Solicitar cancelamento"
                desc="Cancelar precisa de confirmação da contraparte"
                onPress={() => {
                  setSuporteAberto(false);
                  setTimeout(() => setReasonSheetMode("cancel"), 300);
                }}
                colors={colors}
                destructive
              />
            )}

            <SheetActionRow
              icon={<Feather name="file-text" size={18} color="#e06030" />}
              label="Ver comprovante do contrato"
              desc="Detalhes completos para fins de registro"
              onPress={() => setSuporteAberto(false)}
              colors={colors}
            />

            {isEnded && (
              <SheetActionRow
                icon={
                  <Feather name="alert-circle" size={18} color="#e06030" />
                }
                label="Contestar o valor cobrado"
                desc="Se acredita que houve erro no cálculo do tempo"
                onPress={() => setSuporteAberto(false)}
                colors={colors}
              />
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* ReasonSheet — encerrar ou cancelar */}
      <ReasonSheet
        visible={reasonSheetMode !== null}
        mode={reasonSheetMode ?? "end"}
        onClose={() => setReasonSheetMode(null)}
        onConfirm={(reason) => {
          if (reasonSheetMode === "end") {
            handleRequestEnd(reason);
          } else {
            handleRequestCancel(reason);
          }
          setReasonSheetMode(null);
        }}
      />

      {/* Dialog confirmação de cancelamento direto */}
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
        onConfirm={handleConfirmCancelamento}
        onCancel={() => setConfirmCancelar(false)}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  headerTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 20,
    letterSpacing: -0.5,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  homeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  contratoId: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  pendingBannerTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    marginBottom: 3,
  },
  pendingBannerReason: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginBottom: 2,
  },
  pendingBannerSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  pendingNote: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: -4,
  },
  cardSectionLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  pessoaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    fontWeight: "700",
  },
  pessoaNome: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    marginBottom: 4,
  },
  infoChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoChipText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
  },
  verPerfilBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  verPerfilText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#e0603099",
    flex: 1,
  },
  timerLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  timerValue: {
    fontFamily: "DMSans_500Medium",
    fontSize: 48,
    letterSpacing: 2,
    lineHeight: 56,
  },
  progressBarWrap: {
    width: "100%",
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  timerAmount: {
    fontFamily: "DMSans_500Medium",
    fontSize: 28,
    letterSpacing: 1,
    marginTop: 8,
  },
  timerAmountLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  servicoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  servicoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  servicoNome: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    marginBottom: 4,
  },
  servicoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  servicoMetaText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  servicoRate: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
  },
  linhaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  linhaLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    flex: 1,
  },
  linhaValor: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    textAlign: "right",
    flex: 1,
  },
  pagamentoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pagamentoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pagamentoLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  pagamentoSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  avaliacaoTitulo: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#e06030",
    marginBottom: 4,
  },
  avaliacaoSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  avaliacaoBtn: {
    backgroundColor: "#e06030",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  avaliacaoBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  encerrarBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  encerrarBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#e06030",
    letterSpacing: 0.5,
  },
  contratarNovBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 10,
  },
  contratarNovText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#e06030",
  },
  suporteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 4,
  },
  suporteBtnText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sheetTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 18,
  },
  sheetSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  sheetDivider: {
    borderTopWidth: 1,
    marginVertical: 20,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toolIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toolNome: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  toolTipo: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
  },
});
