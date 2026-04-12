import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, ColorPalette } from "@/context/ThemeContext";
import { useContracts } from "@/context/ContractsContext";
import { useConfirmation, ProviderService } from "@/context/ConfirmationContext";
import { useWallet } from "@/context/WalletContext";
import { ScheduleSheet } from "@/components/ScheduleSheet";
import { PaymentSheet, PaymentMethod } from "@/components/PaymentSheet";
import { PixPaymentModal } from "@/components/PixPaymentModal";
import { ServiceSelectionSheet } from "@/components/ServiceSelectionSheet";

const DURACOES = [
  { label: "30 min", ms: 30 * 60 * 1000 },
  { label: "1 hora", ms: 60 * 60 * 1000 },
  { label: "2 horas", ms: 2 * 60 * 60 * 1000 },
  { label: "3 horas", ms: 3 * 60 * 60 * 1000 },
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function formatValor(ms: number, rate: number) {
  return ((ms / 1000 / 3600) * rate).toFixed(2);
}

function formatTimer(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type Etapa = "confirmacao" | "aguardando" | "ativo";

export default function ContractConfirmScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pendingProvider, setPendingProvider } = useConfirmation();
  const { startContract, acceptContract, cancelContract, endContract } = useContracts();
  const { cards } = useWallet();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // ── ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURN ──
  const [etapa, setEtapa] = useState<Etapa>("confirmacao");
  const [tipoContrato, setTipoContrato] = useState<"aberto" | "definido">("aberto");
  const [duracaoIdx, setDuracaoIdx] = useState(1);
  const [servicoSelecionado, setServicoselecionado] = useState<ProviderService | null>(null);
  const [customAtivo, setCustomAtivo] = useState(false);
  const [customHoras, setCustomHoras] = useState(0);
  const [customMinutos, setCustomMinutos] = useState(30);
  const [serviceSheetAberta, setServiceSheetAberta] = useState(false);
  const [scheduleSheetAberta, setScheduleSheetAberta] = useState(false);
  const [paymentSheetAberta, setPaymentSheetAberta] = useState(false);
  const [pixPaymentAberta, setPixPaymentAberta] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<PaymentMethod | null>(null);
  const [cartaoSelecionadoId, setCartaoSelecionadoId] = useState<string | null>(null);
  const [agendado, setAgendado] = useState(false);
  const [agendaHora, setAgendaHora] = useState(8);
  const [agendaMinuto, setAgendaMinuto] = useState(0);
  const [agendaData, setAgendaData] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [segundos, setSegundos] = useState(0);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pendingProvider) {
      router.back();
      return;
    }
    if (!servicoSelecionado && pendingProvider.services.length > 0) {
      setServicoselecionado(pendingProvider.services[0]);
    }
  }, [pendingProvider]);

  useEffect(() => {
    if (etapa !== "aguardando") return;
    spinAnim.setValue(0);
    const anim = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [etapa]);

  useEffect(() => {
    if (etapa !== "ativo") return;
    const id = setInterval(() => setSegundos(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [etapa]);

  // ── CONDITIONAL RENDER AFTER ALL HOOKS ──
  if (!pendingProvider) return null;
  const provider = pendingProvider;
  const servico = servicoSelecionado ?? provider.services[0];

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const valorHora = servico?.hourlyRate ?? 50;
  const duracaoSelecionada = DURACOES[duracaoIdx];
  const duracaoMs = customAtivo
    ? (customHoras * 60 + customMinutos) * 60 * 1000
    : duracaoSelecionada.ms;
  const duracaoLabel = customAtivo
    ? `${customHoras > 0 ? customHoras + "h " : ""}${customMinutos > 0 ? customMinutos + "min" : ""}`.trim() || "0min"
    : duracaoSelecionada.label;
  const valorTotal = tipoContrato === "definido" ? formatValor(duracaoMs, valorHora) : null;
  const timerRestante = tipoContrato === "definido" ? Math.max(0, duracaoMs / 1000 - segundos) : null;
  const progresso = tipoContrato === "definido" ? Math.min(1, segundos / (duracaoMs / 1000)) : null;

  const labelValor = (() => {
    const isCash = metodoPagamento === "dinheiro";
    const isCardOrPix = metodoPagamento === "cartao" || metodoPagamento === "pix";
    const isDefinido = tipoContrato === "definido";
    if (isCash) return "a pagar";
    if (isCardOrPix && isDefinido) return "pagando";
    if (isCardOrPix && !isDefinido) return "a pagar";
    return "pagando";
  })();

  const formatAgendamento = () => {
    const hoje = new Date();
    const amanha = new Date();
    amanha.setDate(hoje.getDate() + 1);
    const isHoje = agendaData.toDateString() === hoje.toDateString();
    const isAmanha = agendaData.toDateString() === amanha.toDateString();
    const diaLabel = isHoje ? "Hoje" : isAmanha ? "Amanhã" : `${agendaData.getDate()} ${MESES[agendaData.getMonth()]}`;
    return `${diaLabel} às ${String(agendaHora).padStart(2, "0")}:${String(agendaMinuto).padStart(2, "0")}`;
  };

  const buildContractData = () => {
    const cartao = cards.find(c => c.id === cartaoSelecionadoId);
    const cardLabel = cartao ? `${cartao.bandeira} •••• ${cartao.lastFour}` : undefined;
    return {
      role: "hiring" as const,
      tipo: tipoContrato === "aberto" ? "cronometro" as const : "timer" as const,
      duracaoTotal: tipoContrato === "definido" ? duracaoMs : undefined,
      serviceId: servico?.serviceId,
      person: {
        name: provider.name,
        initials: provider.initials,
        skill: servico?.nome ?? "",
        nota: provider.nota,
        avaliacoes: provider.avaliacoes,
        distancia: provider.distancia,
        profileId: provider.profileId,
        totalContracts: provider.totalContracts,
        totalServices: provider.services.length,
      },
      servico: servico
        ? {
            nome: servico.nome,
            nota: servico.nota,
            avaliacoes: servico.avaliacoes,
            ratePerHour: valorHora,
            skill: servico.skill,
            tools: servico.tools,
            serviceId: servico.serviceId,
          }
        : undefined,
      paymentMethod: metodoPagamento ?? undefined,
      paymentCardLabel: metodoPagamento === "cartao" ? cardLabel : undefined,
      agendado,
      agendadoLabel: agendado ? formatAgendamento() : undefined,
      ratePerHour: valorHora,
    };
  };

  const confirmar = async () => {
    if (!metodoPagamento || confirmLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmLoading(true);
    try {
      const id = await startContract(buildContractData(), "pending_signature");
      setActiveContractId(id);
      if (metodoPagamento === "pix") {
        setPixPaymentAberta(true);
      } else {
        setEtapa("aguardando");
      }
    } catch (e: any) {
      console.warn("[ContractConfirm] confirmar error:", e);
      Alert.alert(
        "Erro ao criar contrato",
        e?.message ?? "Ocorreu um erro inesperado. Tente novamente.",
        [{ text: "OK" }]
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const aceitar = async () => {
    if (!activeContractId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await acceptContract(activeContractId);
      router.replace(`/contract-detail/${activeContractId}` as any);
    } catch (e) {
      console.warn("[ContractConfirm] aceitar error:", e);
    }
  };

  const encerrar = () => {
    if (activeContractId) endContract(activeContractId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPendingProvider(null);
    router.back();
  };

  const goBack = () => {
    setPendingProvider(null);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={etapa === "aguardando" ? () => setEtapa("confirmacao") : etapa === "ativo" ? encerrar : goBack}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={20} color={"#e06030"} />
        </Pressable>
        <Text style={styles.headerTitle}>Definir contrato</Text>
      </View>

      {/* ── CONFIRMAÇÃO ── */}
      {etapa === "confirmacao" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>você está contratando:</Text>

          {/* Provider card */}
          <View style={styles.providerCard}>
            <View style={styles.providerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{provider.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <View style={styles.infoChipsRow}>
                  <View style={styles.infoChip}>
                    <Feather name="briefcase" size={10} color={colors.textSecondary} />
                    <Text style={styles.infoChipText}>{provider.totalContracts ?? 0} contratos</Text>
                  </View>
                  <View style={styles.infoChip}>
                    <Feather name="tool" size={10} color={colors.textSecondary} />
                    <Text style={styles.infoChipText}>{provider.services.length} {provider.services.length === 1 ? "service" : "services"}</Text>
                  </View>
                  <View style={styles.infoChip}>
                    <Feather name="map-pin" size={10} color={colors.textSecondary} />
                    <Text style={styles.infoChipText}>{provider.distancia} km</Text>
                  </View>
                </View>
              </View>
            </View>
            {provider.profileId && (
              <Pressable
                onPress={() => router.push(`/user-profile/${provider.profileId}` as any)}
                style={styles.verPerfilBtn}
              >
                <Feather name="user" size={11} color={"#e0603099"} />
                <Text style={styles.verPerfilText}>ver perfil completo</Text>
                <Feather name="chevron-right" size={11} color={"#e0603060"} />
              </Pressable>
            )}
          </View>

          {/* Service a contratar */}
          <Text style={styles.sectionLabel}>service a contratar</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setServiceSheetAberta(true);
            }}
            style={[styles.scheduleBtn, servico && styles.scheduleBtnActive]}
          >
            <View style={[styles.scheduleIcon, servico && styles.scheduleIconActive]}>
              <Feather name="tool" size={16} color={servico ? "#e06030" : colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              {servico ? (
                <>
                  <Text style={[styles.scheduleLabel, { color: colors.text }]}>{servico.nome}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Feather name="star" size={9} color={"#e06030"} />
                    <Text style={styles.scheduleSub}>{servico.nota} · {servico.avaliacoes} avaliações</Text>
                    {servico.skill && (
                      <>
                        <Text style={[styles.scheduleSub, { color: colors.textDim }]}>·</Text>
                        <Text style={[styles.scheduleSub, { color: "#e0603088" }]}>{servico.skill}</Text>
                      </>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.scheduleLabel}>Selecionar service</Text>
                  <Text style={styles.scheduleSub}>{provider.services.length} disponíveis</Text>
                </>
              )}
            </View>
            {servico && (
              <Text style={[styles.optionRate, { color: "#e06030" }]}>
                R${(servico.hourlyRate ?? 50).toFixed(0)}/h
              </Text>
            )}
            <Feather name="chevron-right" size={14} color={colors.textDim} />
          </Pressable>
          <View style={{ height: 20 }} />

          {/* Quando */}
          <Text style={styles.sectionLabel}>quando</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setScheduleSheetAberta(true);
            }}
            style={[styles.scheduleBtn, agendado && styles.scheduleBtnActive]}
          >
            <View style={[styles.scheduleIcon, agendado && styles.scheduleIconActive]}>
              <Feather name="calendar" size={16} color={agendado ? "#e06030" : colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scheduleLabel, agendado && { color: colors.text }]}>
                {agendado ? formatAgendamento() : "Agora"}
              </Text>
              <Text style={styles.scheduleSub}>
                {agendado ? "agendado" : "iniciar imediatamente"}
              </Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.textDim} />
          </Pressable>

          {/* Tipo de contrato */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>tipo de contrato</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {[
              { key: "aberto" as const, label: "Tempo em aberto", desc: "Valor acumula com o tempo" },
              { key: "definido" as const, label: "Tempo definido", desc: "Duração e valor fixos" },
            ].map(t => (
              <Pressable
                key={t.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTipoContrato(t.key);
                }}
                style={[styles.contractTypeBtn, tipoContrato === t.key && styles.contractTypeBtnActive, { flex: 1 }]}
              >
                <View style={styles.contractTypeTop}>
                  <View style={[styles.radio, tipoContrato === t.key && styles.radioActive]}>
                    {tipoContrato === t.key && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.contractTypeLabel, tipoContrato === t.key && { color: colors.text }]}>
                    {t.label}
                  </Text>
                </View>
                <Text style={styles.contractTypeDesc}>{t.desc}</Text>
              </Pressable>
            ))}
          </View>

          {/* Duration */}
          {tipoContrato === "definido" && (
            <>
              <Text style={styles.sectionLabel}>duração</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {DURACOES.map((d, i) => (
                  <Pressable
                    key={i}
                    onPress={() => { setDuracaoIdx(i); setCustomAtivo(false); }}
                    style={[
                      styles.durChip,
                      duracaoIdx === i && !customAtivo && styles.durChipActive,
                      { flex: 1 },
                    ]}
                  >
                    <Text style={[styles.durChipText, duracaoIdx === i && !customAtivo && { color: "#fff" }]}>
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setCustomAtivo(c => !c)}
                style={[styles.customChip, customAtivo && styles.customChipActive]}
              >
                <Text style={[styles.customChipText, customAtivo && { color: "#e06030" }]}>
                  Personalizado
                </Text>
                {customAtivo && (
                  <Text style={{ color: "#e06030", fontSize: 12, fontFamily: "DMSans_400Regular" }}>
                    {customHoras === 0 && customMinutos === 0
                      ? "defina abaixo"
                      : `${customHoras > 0 ? customHoras + "h " : ""}${customMinutos > 0 ? customMinutos + "min" : ""}`}
                  </Text>
                )}
              </Pressable>

              {customAtivo && (
                <View style={[styles.schedulePicker, { marginTop: 8 }]}>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerLabel, { textAlign: "center" }]}>horas</Text>
                      <View style={styles.timeUnit}>
                        <Pressable style={styles.timeBtn} onPress={() => setCustomHoras(h => Math.max(0, h - 1))}>
                          <Text style={styles.timeBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.timeValue}>{String(customHoras).padStart(2, "0")}</Text>
                        <Pressable style={styles.timeBtn} onPress={() => setCustomHoras(h => Math.min(23, h + 1))}>
                          <Text style={styles.timeBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerLabel, { textAlign: "center" }]}>minutos</Text>
                      <View style={styles.timeUnit}>
                        <Pressable style={styles.timeBtn} onPress={() => setCustomMinutos(m => m === 0 ? 45 : m - 15)}>
                          <Text style={styles.timeBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.timeValue}>{String(customMinutos).padStart(2, "0")}</Text>
                        <Pressable style={styles.timeBtn} onPress={() => setCustomMinutos(m => m === 45 ? 0 : m + 15)}>
                          <Text style={styles.timeBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              )}
              <View style={{ height: 20 }} />
            </>
          )}

          {/* Value summary */}
          <Text style={[styles.sectionLabel, { marginTop: 4 }]}>resumo</Text>
          <View style={styles.valueSummary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.valueSummaryLabel}>
                {tipoContrato === "definido" ? "valor total" : "valor por hora"}
              </Text>
              <Text style={styles.valueSummaryAmount}>
                {tipoContrato === "definido" ? `R$${valorTotal}` : `R$${valorHora.toFixed(0)}/h`}
              </Text>
              <Text style={styles.valueSummaryMeta} numberOfLines={1}>
                {servico?.nome} · {agendado ? formatAgendamento() : "Agora"}
              </Text>
            </View>
            {tipoContrato === "definido" && (
              <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                <Text style={styles.valueSummaryLabel}>duração</Text>
                <Text style={styles.durLabel}>{duracaoLabel}</Text>
              </View>
            )}
          </View>

          {/* Forma de pagamento */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>forma de pagamento</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPaymentSheetAberta(true);
            }}
            style={[
              styles.scheduleBtn,
              metodoPagamento && styles.scheduleBtnActive,
            ]}
          >
            <View style={[
              styles.scheduleIcon,
              metodoPagamento && styles.scheduleIconActive,
            ]}>
              <Feather
                name={
                  metodoPagamento === "cartao" ? "credit-card"
                  : metodoPagamento === "pix" ? "zap"
                  : metodoPagamento === "dinheiro" ? "dollar-sign"
                  : "credit-card"
                }
                size={16}
                color={metodoPagamento ? "#e06030" : colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              {metodoPagamento === null && (
                <>
                  <Text style={styles.scheduleLabel}>Selecionar método</Text>
                  <Text style={styles.scheduleSub}>obrigatório para confirmar</Text>
                </>
              )}
              {metodoPagamento === "cartao" && (() => {
                const cartao = cards.find(c => c.id === cartaoSelecionadoId);
                return (
                  <>
                    <Text style={[styles.scheduleLabel, { color: colors.text }]}>
                      {cartao ? `${cartao.bandeira} •••• ${cartao.lastFour}` : "Cartão"}
                    </Text>
                    <Text style={styles.scheduleSub}>cartão de crédito/débito</Text>
                  </>
                );
              })()}
              {metodoPagamento === "pix" && (
                <>
                  <Text style={[styles.scheduleLabel, { color: colors.text }]}>Pix</Text>
                  <Text style={styles.scheduleSub}>QR Code gerado ao confirmar</Text>
                </>
              )}
              {metodoPagamento === "dinheiro" && (
                <>
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Dinheiro</Text>
                  <Text style={styles.scheduleSub}>pague direto ao contratado</Text>
                </>
              )}
            </View>
            <Feather name="chevron-right" size={14} color={colors.textDim} />
          </Pressable>

          <Pressable
            onPress={(metodoPagamento && !confirmLoading) ? confirmar : undefined}
            style={[styles.confirmBtn, (!metodoPagamento || confirmLoading) && styles.confirmBtnDisabled]}
          >
            <Text style={[styles.confirmBtnText, (!metodoPagamento || confirmLoading) && { color: colors.textDim }]}>
              {confirmLoading ? "Criando contrato..." : metodoPagamento === "pix" ? "Confirmar e gerar Pix" : "Confirmar e enviar solicitação"}
            </Text>
          </Pressable>
          <Pressable onPress={goBack} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ── SERVICE SELECTION SHEET ── */}
      <ServiceSelectionSheet
        visible={serviceSheetAberta}
        onClose={() => setServiceSheetAberta(false)}
        services={provider.services}
        selectedId={servico?.id ?? null}
        onSelect={(s) => setServicoselecionado(s)}
      />

      {/* ── PAYMENT SHEET ── */}
      <PaymentSheet
        visible={paymentSheetAberta}
        onClose={() => setPaymentSheetAberta(false)}
        initialMethod={metodoPagamento}
        initialCardId={cartaoSelecionadoId}
        onConfirm={(method, cardId) => {
          setMetodoPagamento(method);
          setCartaoSelecionadoId(cardId);
        }}
      />

      {/* ── PIX PAYMENT MODAL ── */}
      <PixPaymentModal
        visible={pixPaymentAberta}
        onClose={async () => {
          if (activeContractId) await cancelContract(activeContractId);
          setActiveContractId(null);
          setPixPaymentAberta(false);
        }}
        onConfirm={() => {
          setPixPaymentAberta(false);
          setEtapa("aguardando");
        }}
        providerName={provider.name}
        amount={tipoContrato === "definido" ? Number(valorTotal ?? 0) : valorHora}
        tipoContrato={tipoContrato}
      />

      {/* ── SCHEDULE SHEET ── */}
      <ScheduleSheet
        visible={scheduleSheetAberta}
        onClose={() => setScheduleSheetAberta(false)}
        initialDate={agendaData}
        initialHora={agendaHora}
        initialMinuto={agendaMinuto}
        agendado={agendado}
        onConfirm={(data, hora, minuto, isAgendado) => {
          setAgendaData(data);
          setAgendaHora(hora);
          setAgendaMinuto(minuto);
          setAgendado(isAgendado);
        }}
      />

      {/* ── AGUARDANDO ── */}
      {etapa === "aguardando" && (
        <View style={[styles.waitingContainer, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.spinnerWrap}>
            <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin }] }]} />
            <View style={styles.spinnerAvatar}>
              <Text style={styles.spinnerAvatarText}>{provider.initials}</Text>
            </View>
          </View>

          <Text style={styles.waitTitle}>Aguardando confirmação</Text>
          <Text style={styles.waitSub}>{provider.name} está sendo notificado</Text>
          <Text style={styles.waitMeta}>
            {servico?.nome} · {tipoContrato === "definido"
              ? `${duracaoLabel} · R$${valorTotal}`
              : `Tempo em aberto · R$${valorHora.toFixed(0)}/h`}
          </Text>

          <View style={styles.simCard}>
            <Text style={styles.simLabel}>simular resposta do contratado:</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={aceitar} style={styles.simAcceptBtn}>
                <Feather name="check" size={14} color={"#18a06b"} />
                <Text style={styles.simAcceptText}>Aceitar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (activeContractId) await cancelContract(activeContractId);
                  setActiveContractId(null);
                  setEtapa("confirmacao");
                }}
                style={styles.simRejectBtn}
              >
                <Text style={styles.simRejectText}>Recusar</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={async () => {
              if (activeContractId) await cancelContract(activeContractId);
              setActiveContractId(null);
              goBack();
            }}
            style={[styles.cancelBtn, { width: "100%" }]}
          >
            <Text style={styles.cancelBtnText}>Cancelar solicitação</Text>
          </Pressable>
        </View>
      )}

      {/* ── ATIVO ── */}
      {etapa === "ativo" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>contrato ativo</Text>
          </View>

          <View style={styles.activeProviderRow}>
            <View style={[styles.avatar, { borderColor: "#18a06b" }]}>
              <Text style={styles.avatarText}>{provider.initials}</Text>
            </View>
            <View>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.activeSkillText}>{servico?.nome}</Text>
            </View>
          </View>

          {tipoContrato === "aberto" ? (
            <View style={styles.timerWrap}>
              <Text style={styles.timerLabel}>tempo decorrido</Text>
              <Text style={styles.timerValue}>{formatTimer(segundos)}</Text>
              <Text style={styles.timerAmount}>
                R${((segundos / 3600) * valorHora).toFixed(2)}
              </Text>
              <Text style={styles.timerAmountLabel}>{labelValor}</Text>
            </View>
          ) : (
            <View style={styles.timerWrap}>
              <Text style={styles.timerLabel}>tempo restante</Text>
              <Text style={[styles.timerValue, (timerRestante ?? 0) < 600 && { color: "#ff4444" }]}>
                {formatTimer(timerRestante ?? 0)}
              </Text>
              <View style={styles.progressBarWrap}>
                <View style={[
                  styles.progressFill,
                  {
                    width: `${Math.round((progresso ?? 0) * 100)}%` as any,
                    backgroundColor: (timerRestante ?? 0) < 600 ? "#ff4444" : "#e06030",
                  }
                ]} />
              </View>
              <Text style={styles.timerAmount}>R${valorTotal}</Text>
              <Text style={styles.timerAmountLabel}>{labelValor}</Text>
            </View>
          )}

          <Pressable onPress={encerrar} style={styles.endBtn}>
            <Text style={styles.endBtnText}>■  encerrar contrato</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      fontFamily: "Sora_700Bold",
      letterSpacing: -0.5,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    providerCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 20,
      padding: 18,
      marginBottom: 20,
    },
    providerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    verPerfilBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
    },
    verPerfilText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: "#e0603099",
      flex: 1,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "#e0603020",
      borderWidth: 2,
      borderColor: "#e0603040",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarText: {
      color: "#e06030",
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    providerName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "Sora_700Bold",
      marginBottom: 4,
    },
    infoChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    infoChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 20,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    infoChipText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textSecondary,
    },
    rateValue: {
      color: "#e06030",
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    rateLabel: {
      color: colors.textMuted,
      fontSize: 9,
      fontFamily: "DMSans_400Regular",
      letterSpacing: 0.5,
      marginTop: 2,
    },
    optionRow: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    optionRowActive: {
      backgroundColor: "#e0603015",
      borderColor: "#e0603050",
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.textDim,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    radioActive: {
      borderColor: "#e06030",
    },
    radioInner: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: "#e06030",
    },
    optionLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Sora_600SemiBold",
    },
    optionMeta: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
    },
    optionRate: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    toolRow: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    toolRowActive: {
      backgroundColor: "#18a06b08",
      borderColor: "#18a06b30",
    },
    toolIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.menuIconBg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    toolIconActive: {
      backgroundColor: "#18a06b15",
      borderColor: "#18a06b30",
    },
    toolName: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Sora_600SemiBold",
    },
    toolType: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      marginTop: 2,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.textDim,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    checkboxActive: {
      backgroundColor: "#18a06b",
      borderColor: "#18a06b",
    },
    scheduleBtn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    scheduleBtnActive: {
      borderColor: "#e0603040",
    },
    scheduleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.menuIconBg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    scheduleIconActive: {
      borderColor: "#e0603040",
    },
    scheduleLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Sora_600SemiBold",
    },
    scheduleSub: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      marginTop: 2,
    },
    schedulePicker: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 16,
      marginBottom: 8,
    },
    pickerLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    dayChip: {
      backgroundColor: colors.menuIconBg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
      gap: 4,
      minWidth: 52,
    },
    dayChipActive: {
      backgroundColor: "#e06030",
      borderColor: "#e06030",
    },
    dayChipWeekday: {
      color: colors.textMuted,
      fontSize: 9,
      fontFamily: "DMSans_400Regular",
      textTransform: "uppercase",
    },
    dayChipNum: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    timePicker: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    timeUnit: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    timeBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.menuIconBg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    timeBtnText: {
      color: colors.textSecondary,
      fontSize: 18,
      fontFamily: "DMSans_400Regular",
    },
    timeValue: {
      flex: 1,
      textAlign: "center",
      color: colors.text,
      fontSize: 28,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    timeSep: {
      color: colors.textMuted,
      fontSize: 24,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    scheduleConfirmBtn: {
      flex: 1,
      backgroundColor: "#e06030",
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
    },
    scheduleConfirmBtnText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Sora_600SemiBold",
    },
    scheduleNowBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
    },
    scheduleNowBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontFamily: "Sora_400Regular",
    },
    contractTypeBtn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 14,
    },
    contractTypeBtnActive: {
      backgroundColor: "#e0603015",
      borderColor: "#e0603050",
    },
    contractTypeTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 6,
    },
    contractTypeLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      fontFamily: "Sora_600SemiBold",
      flex: 1,
      flexWrap: "wrap",
      lineHeight: 18,
    },
    contractTypeDesc: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      lineHeight: 16,
      paddingLeft: 26,
    },
    durChip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 4,
      alignItems: "center",
    },
    durChipActive: {
      backgroundColor: "#e06030",
      borderColor: "#e06030",
    },
    durChipText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      fontFamily: "DMSans_500Medium",
    },
    customChip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 12,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    customChipActive: {
      backgroundColor: "#e0603015",
      borderColor: "#e0603050",
    },
    customChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: "DMSans_400Regular",
    },
    valueSummary: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    valueSummaryLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    valueSummaryAmount: {
      color: "#e06030",
      fontSize: 24,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    valueSummaryMeta: {
      color: colors.textDim,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      marginTop: 3,
    },
    durLabel: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    confirmBtn: {
      backgroundColor: "#e06030",
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      marginBottom: 10,
    },
    confirmBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "Sora_700Bold",
    },
    confirmBtnDisabled: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    cancelBtn: {
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 14,
      alignItems: "center",
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontFamily: "Sora_400Regular",
    },
    waitingContainer: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      alignItems: "center",
    },
    spinnerWrap: {
      width: 100,
      height: 100,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 28,
    },
    spinnerRing: {
      position: "absolute",
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      borderColor: "transparent",
      borderTopColor: "#e06030",
    },
    spinnerAvatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    spinnerAvatarText: {
      color: "#18a06b",
      fontSize: 22,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
    },
    waitTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "Sora_700Bold",
      marginBottom: 8,
      textAlign: "center",
    },
    waitSub: {
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: "DMSans_400Regular",
      marginBottom: 8,
      textAlign: "center",
    },
    waitMeta: {
      color: colors.textDim,
      fontSize: 11,
      fontFamily: "DMSans_400Regular",
      marginBottom: 48,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    simCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
      width: "100%",
    },
    simLabel: {
      color: colors.textDim,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      marginBottom: 12,
    },
    simAcceptBtn: {
      flex: 1,
      backgroundColor: "#18a06b15",
      borderWidth: 1,
      borderColor: "#18a06b30",
      borderRadius: 10,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    simAcceptText: {
      color: "#18a06b",
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Sora_600SemiBold",
    },
    simRejectBtn: {
      flex: 1,
      backgroundColor: "#ff444415",
      borderWidth: 1,
      borderColor: "#ff444430",
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    simRejectText: {
      color: "#ff4444",
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "Sora_600SemiBold",
    },
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#18a06b10",
      borderWidth: 1,
      borderColor: "#18a06b25",
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 14,
      alignSelf: "flex-start",
      marginBottom: 28,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#18a06b",
    },
    activeBadgeText: {
      color: "#18a06b",
      fontSize: 11,
      fontFamily: "DMSans_400Regular",
      letterSpacing: 1,
    },
    activeProviderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 36,
    },
    activeSkillText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: "DMSans_400Regular",
      marginTop: 2,
    },
    timerWrap: {
      alignItems: "center",
      marginBottom: 36,
    },
    timerLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    timerValue: {
      fontSize: 52,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
      color: colors.text,
      letterSpacing: 4,
      lineHeight: 60,
    },
    timerAmount: {
      color: "#e06030",
      fontSize: 22,
      fontWeight: "700",
      fontFamily: "DMSans_500Medium",
      marginTop: 12,
    },
    timerAmountLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: "DMSans_400Regular",
      marginTop: 4,
    },
    progressBarWrap: {
      backgroundColor: colors.cardBorder,
      borderRadius: 4,
      height: 4,
      width: "80%",
      marginTop: 16,
      marginBottom: 8,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    endBtn: {
      borderWidth: 1,
      borderColor: "#e0603040",
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
    },
    endBtnText: {
      color: "#e06030",
      fontSize: 13,
      fontFamily: "DMSans_400Regular",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
  });
}
