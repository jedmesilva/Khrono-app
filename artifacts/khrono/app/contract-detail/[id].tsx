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

function SheetActionRow({ icon, label, desc, onPress, colors, destructive }: SheetActionRowProps) {
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
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        backgroundColor: destructive ? "#ff444410" : "#e0603012",
        borderColor: destructive ? "#ff444425" : "#e0603025",
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 13,
          fontFamily: "Sora_600SemiBold",
          color: destructive ? "#e05050" : colors.text,
          marginBottom: 2,
        }}>
          {label}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: "DMSans_400Regular", color: colors.textSecondary, lineHeight: 15 }}>
          {desc}
        </Text>
      </View>
      <Feather name="chevron-right" size={15} color={destructive ? "#e0505060" : colors.chevron} />
    </Pressable>
  );
}

function getDetailValueLabel(contract: Contract): string {
  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const isCash = contract.paymentMethod === "dinheiro";
  const isCardOrPix = contract.paymentMethod === "cartao" || contract.paymentMethod === "pix";

  if (contract.status === "ended") {
    return isHiring ? "pago" : "recebido";
  }

  if (contract.status === "pending_signature" || contract.status === "accepted" || contract.status === "paused") {
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
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
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
  const { activeContracts, history, endContract, cancelContract } = useContracts();

  const contract = [...activeContracts, ...history].find(c => c.id === id);

  const [now, setNow] = useState(Date.now());
  const [notaSelecionada, setNotaSelecionada] = useState(0);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [suporteAberto, setSuporteAberto] = useState(false);
  const [confirmEncerrar, setConfirmEncerrar] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);

  const suporteRef = useRef<BottomSheetModal>(null);
  const suporteSnapPoints = useMemo(() => ["85%"], []);
  const suporteSheetBg = useMemo(() => ({
    backgroundColor: colors.sheetBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.sheetBorder,
  }), [colors]);
  const suporteHandleStyle = useMemo(
    () => ({ backgroundColor: colors.handleColor, width: 36, height: 4 }),
    [colors]
  );
  const renderSuporteBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
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

  if (!contract) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={20} color="#e06030" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>K<Text style={{ color: "#e06030" }}>r</Text>ono</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.textMuted, fontFamily: "DMSans_400Regular", fontSize: 12 }}>Contrato não encontrado</Text>
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
  const isRunning = isContractRunning(contract);
  const isScheduled = isActive && !!contract.agendado;
  const cor = colors.accent;

  // elapsed only counts when contract is actively running
  const elapsed = isRunning
    ? now - contract.startedAt
    : isEnded && contract.endedAt && contract.startedAt > 0
      ? contract.endedAt - contract.startedAt
      : 0;
  const tempoDecorrido = elapsed;
  const valorHora = contract.ratePerHour;

  const valorAcumulado = isTimer && contract.duracaoTotal
    ? ((contract.duracaoTotal / 1000 / 3600) * valorHora).toFixed(2)
    : ((tempoDecorrido / 1000 / 3600) * valorHora).toFixed(2);

  const restante = isTimer && isRunning && contract.duracaoTotal
    ? Math.max(0, contract.duracaoTotal - elapsed)
    : null;
  const progresso = isTimer && isRunning && contract.duracaoTotal
    ? Math.min(1, elapsed / contract.duracaoTotal)
    : null;

  // Human-readable status label
  const statusLabel = isPending ? "aguardando aceite"
    : isAccepted ? "aguardando início"
    : isPaused ? "pausado"
    : isScheduled ? "agendado"
    : isRunning ? "em andamento"
    : isEnded ? "encerrado"
    : "em andamento";

  const contratoId = `KRN-${contract.id.slice(-8).toUpperCase()}`;

  const handleEncerrar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmEncerrar(true);
  };

  const handleConfirmarEncerramento = () => {
    setConfirmEncerrar(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    endContract(contract.id);
  };

  const handleConfirmarCancelamento = () => {
    setConfirmCancelar(false);
    setSuporteAberto(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    cancelContract(contract.id);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={20} color="#e06030" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>K<Text style={{ color: "#e06030" }}>r</Text>ono</Text>
        </View>
        <Pressable onPress={() => router.replace("/(tabs)" as any)} style={styles.homeBtn} hitSlop={12}>
          <Feather name="home" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status badge + ID */}
        <View style={styles.statusRow}>
          <View style={[
            styles.statusBadge,
            isRunning
              ? { backgroundColor: "#18a06b15", borderColor: "#18a06b30" }
              : isPending || isAccepted
                ? { backgroundColor: "#e0603010", borderColor: "#e0603025" }
                : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}>
            <View style={[styles.statusDot, {
              backgroundColor: isRunning ? "#18a06b"
                : isPending || isAccepted ? cor
                : isPaused ? "#ffaa00"
                : colors.textMuted
            }]} />
            <Text style={[styles.statusText, {
              color: isRunning ? "#18a06b"
                : isPending || isAccepted ? cor
                : isPaused ? "#ffaa00"
                : colors.textSecondary
            }]}>
              {statusLabel}
            </Text>
          </View>
          <Text style={[styles.contratoId, { color: colors.textMuted }]}>{contratoId}</Text>
        </View>

        {/* Pessoa */}
        <Text style={[styles.cardSectionLabel, { color: colors.textMuted, marginBottom: 10 }]}>
          {isHiring ? "você contratou:" : "você foi contratado por:"}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 12 }]}>
          <View style={styles.pessoaRow}>
            <View style={[styles.avatar, { backgroundColor: cor + "20", borderColor: cor + "40" }]}>
              <Text style={[styles.avatarText, { color: cor }]}>{contract.person.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pessoaNome, { color: colors.text }]}>{contract.person.name}</Text>
              <View style={styles.infoChipsRow}>
                {contract.person.totalContracts != null && (
                  <View style={styles.infoChip}>
                    <Feather name="briefcase" size={10} color={colors.textSecondary} />
                    <Text style={[styles.infoChipText, { color: colors.textSecondary }]}>{contract.person.totalContracts} contratos</Text>
                  </View>
                )}
                {contract.person.totalServices != null && (
                  <View style={styles.infoChip}>
                    <Feather name="tool" size={10} color={colors.textSecondary} />
                    <Text style={[styles.infoChipText, { color: colors.textSecondary }]}>{contract.person.totalServices} {contract.person.totalServices === 1 ? "service" : "services"}</Text>
                  </View>
                )}
                {contract.person.distancia != null && (
                  <View style={styles.infoChip}>
                    <Feather name="map-pin" size={10} color={colors.textSecondary} />
                    <Text style={[styles.infoChipText, { color: colors.textSecondary }]}>{contract.person.distancia} km</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          {contract.person.profileId && (
            <Pressable
              onPress={() => router.push(`/user-profile/${contract.person.profileId}` as any)}
              style={[styles.verPerfilBtn, { borderTopColor: colors.surface }]}
            >
              <Feather name="user" size={11} color={"#e0603099"} />
              <Text style={styles.verPerfilText}>ver perfil completo</Text>
              <Feather name="chevron-right" size={11} color={"#e0603060"} />
            </Pressable>
          )}
        </View>

        {/* Cronômetro / Timer — só exibe quando o contrato está em andamento ou encerrado */}
        {(isRunning || isEnded || isScheduled) && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: cor + "20", alignItems: "center", marginBottom: 12 }]}>
            {isTimer ? (
              <>
                <Text style={[styles.timerLabel, { color: colors.textMuted }]}>tempo restante</Text>
                <Text style={[styles.timerValue, { color: colors.text }, isRunning && (restante ?? 0) < 600000 && { color: "#ff4444" }]}>
                  {formatTimer(Math.floor((restante ?? contract.duracaoTotal ?? 0) / 1000))}
                </Text>
                <View style={[styles.progressBarWrap, { backgroundColor: colors.surface }]}>
                  <View style={[styles.progressFill, { width: `${Math.round((progresso ?? 0) * 100)}%` as any, backgroundColor: isRunning && (restante ?? 0) < 600000 ? "#ff4444" : cor }]} />
                </View>
                <Text style={[styles.timerAmount, { color: cor }]}>R${valorAcumulado}</Text>
                <Text style={[styles.timerAmountLabel, { color: colors.textMuted }]}>{getDetailValueLabel(contract)}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.timerLabel, { color: colors.textMuted }]}>
                  {isEnded ? "tempo decorrido" : isRunning ? "tempo decorrido" : "duração prevista"}
                </Text>
                <Text style={[styles.timerValue, { color: colors.text }]}>{formatTimer(Math.floor(elapsed / 1000))}</Text>
                <Text style={[styles.timerAmount, { color: isRunning ? cor : colors.textSecondary }]}>
                  {isRunning || isEnded ? `R$${valorAcumulado}` : "—"}
                </Text>
                <Text style={[styles.timerAmountLabel, { color: colors.textMuted }]}>{getDetailValueLabel(contract)}</Text>
              </>
            )}
            {isScheduled && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                <Feather name="calendar" size={11} color={cor + "80"} />
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 11, color: cor + "99" }}>
                  {contract.agendadoLabel ? `Inicia em ${contract.agendadoLabel}` : "Agendado"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Serviço */}
        {contract.servico && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 12 }]}>
            <Text style={[styles.cardSectionLabel, { color: colors.textMuted }]}>serviço contratado</Text>
            <View style={{ gap: 10 }}>
              <View style={styles.servicoRow}>
                <View style={[styles.servicoIconWrap, { backgroundColor: cor + "15", borderColor: cor + "30" }]}>
                  <Feather name="briefcase" size={14} color={cor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.servicoNome, { color: colors.text }]}>{contract.servico.nome}</Text>
                  {contract.servico.nota != null && (
                    <View style={styles.servicoMeta}>
                      <Feather name="star" size={10} color="#e06030" />
                      <Text style={[styles.servicoMetaText, { color: colors.textSecondary }]}>
                        {contract.servico.nota} · {contract.servico.avaliacoes} avaliações
                      </Text>
                    </View>
                  )}
                  {contract.servico.skill && (
                    <View style={styles.servicoMeta}>
                      <Feather name="tool" size={9} color="#e0603099" />
                      <Text style={[styles.servicoMetaText, { color: "#e0603099" }]}>{contract.servico.skill}</Text>
                    </View>
                  )}
                  {contract.servico.tools && contract.servico.tools.length > 0 && (
                    <View style={styles.servicoMeta}>
                      <Feather name="key" size={9} color="#e0603099" />
                      <Text style={[styles.servicoMetaText, { color: "#e0603099" }]} numberOfLines={1}>
                        {contract.servico.tools.join(", ")}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.servicoRate, { color: cor }]}>R${contract.servico.ratePerHour.toFixed(0)}/h</Text>
              </View>
            </View>
          </View>
        )}

        {/* Detalhes */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 12 }]}>
          <Text style={[styles.cardSectionLabel, { color: colors.textMuted }]}>detalhes</Text>
          <View style={{ gap: 12 }}>
            {[
              { label: "Tipo", valor: isTimer ? "Tempo definido" : "Tempo em aberto", corValor: undefined },
              ...(!contract.servico ? [{ label: "Valor/hora", valor: `R$${valorHora.toFixed(0)}/h`, corValor: cor }] : []),
              { label: "Execução definida para", valor: contract.agendado && contract.agendadoLabel ? contract.agendadoLabel : "Agora", corValor: undefined },
              ...(!isActive ? [
                { label: "Duração", valor: formatTimer(Math.floor(tempoDecorrido / 1000)), corValor: undefined },
                { label: "Valor", valor: `R$${valorAcumulado}`, corValor: cor },
              ] : []),
              { label: "Iniciado em", valor: formatData(contract.startedAt), corValor: undefined },
              ...(contract.endedAt ? [{ label: "Encerrado em", valor: formatData(contract.endedAt), corValor: undefined }] : []),
            ].map((item, i) => (
              <View key={i} style={[styles.linhaRow, { borderBottomColor: colors.surface }]}>
                <Text style={[styles.linhaLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.linhaValor, { color: item.corValor ?? colors.text }]}>{item.valor}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pagamento */}
        {contract.paymentMethod && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 12 }]}>
            <Text style={[styles.cardSectionLabel, { color: colors.textMuted }]}>forma de pagamento</Text>
            <View style={styles.pagamentoRow}>
              <View style={[styles.pagamentoIconWrap, { borderColor: "#e0603040" }]}>
                <Feather
                  name={contract.paymentMethod === "cartao" ? "credit-card" : contract.paymentMethod === "pix" ? "zap" : "dollar-sign"}
                  size={15}
                  color="#e06030"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pagamentoLabel, { color: colors.text }]}>
                  {contract.paymentMethod === "cartao" ? contract.paymentCardLabel ?? "Cartão" : contract.paymentMethod === "pix" ? "Pix" : "Dinheiro"}
                </Text>
                <Text style={[styles.pagamentoSub, { color: colors.textMuted }]}>
                  {contract.paymentMethod === "cartao" ? "cartão de crédito/débito" : contract.paymentMethod === "pix" ? "QR Code / chave Pix" : "pago direto ao contratado"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tools */}
        {contract.tools && contract.tools.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 12 }]}>
            <Text style={[styles.cardSectionLabel, { color: colors.textMuted }]}>tools utilizadas</Text>
            <View style={{ gap: 8 }}>
              {contract.tools.map((t, i) => (
                <View key={i} style={styles.toolRow}>
                  <View style={[styles.toolIcon, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    {t.tipo === "Veículo"
                      ? <MaterialCommunityIcons name="car-outline" size={14} color={colors.textSecondary} />
                      : <Feather name="tool" size={14} color={colors.textSecondary} />
                    }
                  </View>
                  <View>
                    <Text style={[styles.toolNome, { color: colors.textSecondary }]}>{t.nome}</Text>
                    <Text style={[styles.toolTipo, { color: colors.textMuted }]}>{t.tipo}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Avaliação pendente — somente após encerrado */}
        {isEnded && isHiring && !avaliacaoEnviada && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: "#e0603030", marginBottom: 12 }]}>
            <Text style={styles.avaliacaoTitulo}>Avaliação pendente</Text>
            <Text style={[styles.avaliacaoSub, { color: colors.textSecondary }]}>Como foi sua experiência com {contract.person.name}?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotaSelecionada(n); }} hitSlop={4}>
                  <MaterialCommunityIcons name={n <= notaSelecionada ? "star" : "star-outline"} size={32} color="#e06030" />
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={notaSelecionada === 0}
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setAvaliacaoEnviada(true); }}
              style={[styles.avaliacaoBtn, notaSelecionada === 0 && { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.avaliacaoBtnText, notaSelecionada === 0 && { color: colors.textMuted }]}>Enviar avaliação</Text>
            </Pressable>
          </View>
        )}

        {avaliacaoEnviada && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: "#e0603030", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }]}>
            <Feather name="check-circle" size={16} color="#18a06b" />
            <Text style={{ color: "#18a06b", fontSize: 13, fontFamily: "Sora_600SemiBold" }}>Avaliação enviada!</Text>
          </View>
        )}

        {/* Ações — adaptadas por estado */}

        {/* Aguardando aceite */}
        {isPending && isHiring && (
          <View style={[styles.encerrarBtn, { borderColor: cor + "25", backgroundColor: cor + "08", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }]}>
            <Feather name="clock" size={13} color={cor + "99"} />
            <Text style={[styles.encerrarBtnText, { color: cor + "99", letterSpacing: 0.5 }]}>Aguardando aceite do contratado</Text>
          </View>
        )}

        {/* Aceitar contrato (hired recebe proposta) */}
        {isPending && !isHiring && (
          <Pressable
            style={[styles.encerrarBtn, { backgroundColor: "#18a06b", borderColor: "#18a06b" }]}
            onPress={() => {}}
          >
            <Text style={[styles.encerrarBtnText, { color: "#fff" }]}>✓  aceitar contrato</Text>
          </Pressable>
        )}

        {/* Iniciar contrato (após aceite) */}
        {isAccepted && (
          <Pressable
            style={[styles.encerrarBtn, { backgroundColor: cor, borderColor: cor }]}
            onPress={() => {}}
          >
            <Text style={[styles.encerrarBtnText, { color: "#fff" }]}>▶  iniciar contrato</Text>
          </Pressable>
        )}

        {/* Pausado */}
        {isPaused && (
          <View style={[styles.encerrarBtn, { borderColor: "#ffaa0040", backgroundColor: "#ffaa0008", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }]}>
            <Feather name="pause-circle" size={13} color="#ffaa00" />
            <Text style={[styles.encerrarBtnText, { color: "#ffaa00" }]}>Contrato pausado</Text>
          </View>
        )}

        {/* Encerrar — somente quando rodando */}
        {isRunning && (
          <Pressable onPress={handleEncerrar} style={[styles.encerrarBtn, { borderColor: "#e0603040" }]}>
            <Text style={styles.encerrarBtnText}>■  encerrar contrato</Text>
          </Pressable>
        )}

        {/* Contratar novamente — somente após encerrado */}
        {isEnded && (
          <Pressable onPress={() => router.back()} style={styles.contratarNovBtn}>
            <Feather name="rotate-ccw" size={15} color="#e06030" />
            <Text style={styles.contratarNovText}>Contratar novamente</Text>
          </Pressable>
        )}

        <Pressable onPress={() => setSuporteAberto(true)} style={[styles.suporteBtn, { borderColor: colors.surface }]}>
          <Feather name="help-circle" size={15} color={colors.textMuted} />
          <Text style={[styles.suporteBtnText, { color: colors.textMuted }]}>Preciso de ajuda com este contrato</Text>
        </Pressable>
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
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: insets.bottom + 24 }}
        >
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>O que você precisa?</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>{contratoId}</Text>
            </View>
            <Pressable onPress={() => setSuporteAberto(false)} hitSlop={8}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Ações disponíveis — contextuais ao status e papel do usuário */}
          <View style={{ gap: 2, marginBottom: 20 }}>
            {/* Ações de contratos pendentes/aceitos */}
            {(isPending || isAccepted) && (
              <SheetActionRow
                icon={<Feather name="x-circle" size={18} color="#e06030" />}
                label="Cancelar o contrato"
                desc="Cancelar antes de iniciar sem custo"
                onPress={() => { setConfirmCancelar(true); }}
                colors={colors}
                destructive
              />
            )}
            {(isPending || isAccepted) && (
              <SheetActionRow
                icon={<Feather name="edit-2" size={18} color="#e06030" />}
                label="Redefinir detalhes do contrato"
                desc="Alterar serviço, horário ou valor combinado"
                onPress={() => setSuporteAberto(false)}
                colors={colors}
              />
            )}

            {/* Ações de contratos em andamento */}
            {(isRunning || isPaused) && (
              <SheetActionRow
                icon={<Feather name="square" size={18} color="#e06030" />}
                label="Encerrar o contrato agora"
                desc="Finalizar e calcular o valor total acumulado"
                onPress={() => { setSuporteAberto(false); handleEncerrar(); }}
                colors={colors}
              />
            )}
            {isRunning && (
              <SheetActionRow
                icon={<Feather name="x-circle" size={18} color="#e06030" />}
                label="Cancelar o contrato"
                desc="Cancelar sem registrar valor (sujeito a análise)"
                onPress={() => { setConfirmCancelar(true); }}
                colors={colors}
                destructive
              />
            )}
            {(isRunning || isPaused || isAccepted) && (
              <SheetActionRow
                icon={<Feather name="credit-card" size={18} color="#e06030" />}
                label="Alterar forma de pagamento"
                desc="Trocar o método de pagamento do contrato"
                onPress={() => setSuporteAberto(false)}
                colors={colors}
              />
            )}
            {(isRunning || isPaused) && (
              <SheetActionRow
                icon={<Feather name="edit-2" size={18} color="#e06030" />}
                label="Redefinir detalhes do contrato"
                desc="Alterar valor ou informações do serviço"
                onPress={() => setSuporteAberto(false)}
                colors={colors}
              />
            )}

            {/* Ações pós-encerramento */}
            {isEnded && (
              <SheetActionRow
                icon={<Feather name="alert-circle" size={18} color="#e06030" />}
                label="Contestar o valor cobrado"
                desc="Se acredita que houve erro no cálculo do tempo"
                onPress={() => setSuporteAberto(false)}
                colors={colors}
              />
            )}
            {isEnded && (
              <SheetActionRow
                icon={<Feather name="rotate-ccw" size={18} color="#e06030" />}
                label="Solicitar reembolso"
                desc="Para cancelamentos ou cobranças indevidas"
                onPress={() => setSuporteAberto(false)}
                colors={colors}
              />
            )}
            {isEnded && isHiring && (
              <SheetActionRow
                icon={<Feather name="star" size={18} color="#e06030" />}
                label="Problema com a avaliação"
                desc="Avaliação incorreta ou prazo não disponível"
                onPress={() => setSuporteAberto(false)}
                colors={colors}
              />
            )}

            {/* Sempre disponível */}
            <SheetActionRow
              icon={<Feather name="file-text" size={18} color="#e06030" />}
              label="Ver comprovante do contrato"
              desc="Detalhes completos para fins de registro"
              onPress={() => setSuporteAberto(false)}
              colors={colors}
            />
          </View>

          {/* Separador + suporte humano */}
          <View style={[styles.sheetDivider, { borderTopColor: colors.surface }]}>
            <Text style={[styles.sheetDividerLabel, { color: colors.textMuted }]}>precisa de mais ajuda?</Text>
          </View>
          <Pressable
            onPress={() => setSuporteAberto(false)}
            style={[styles.suporteHumanoBtn, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
          >
            <View style={[styles.supportOptionIcon, { backgroundColor: "#e0603015", borderColor: "#e0603025" }]}>
              <Feather name="message-circle" size={18} color="#e06030" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.supportOptionLabel, { color: colors.text }]}>Solicitar suporte</Text>
              <Text style={[styles.supportOptionDesc, { color: colors.textSecondary }]}>Fale com nossa equipe sobre este contrato</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.chevron} />
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <AppDialog
        visible={confirmEncerrar}
        title="Encerrar contrato?"
        message="O valor será calculado e registrado no histórico."
        buttons={[
          { text: "Cancelar", style: "cancel", onPress: () => setConfirmEncerrar(false) },
          { text: "Encerrar", style: "destructive", onPress: handleConfirmarEncerramento },
        ]}
        onDismiss={() => setConfirmEncerrar(false)}
      />
      <AppDialog
        visible={confirmCancelar}
        title="Cancelar contrato?"
        message="O contrato será cancelado e movido para o histórico. Esta ação não pode ser desfeita."
        buttons={[
          { text: "Voltar", style: "cancel", onPress: () => setConfirmCancelar(false) },
          { text: "Cancelar contrato", style: "destructive", onPress: handleConfirmarCancelamento },
        ]}
        onDismiss={() => setConfirmCancelar(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  homeBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontFamily: "Sora_700Bold", letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "DMSans_400Regular" },
  contratoId: { fontSize: 11, fontFamily: "DMSans_400Regular" },
  card: { borderWidth: 1, borderRadius: 20, padding: 18 },
  pessoaRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  verPerfilBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  verPerfilText: { fontFamily: "DMSans_400Regular", fontSize: 11, flex: 1, color: "#e0603099" },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: "700", fontFamily: "DMSans_500Medium" },
  pessoaNome: { fontSize: 16, fontFamily: "DMSans_500Medium", fontWeight: "700", marginBottom: 6 },
  infoChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  infoChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoChipText: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  roleBadge: { borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 8 },
  roleText: { fontSize: 9, fontFamily: "DMSans_400Regular", letterSpacing: 0.5, textTransform: "uppercase" },
  timerLabel: { fontSize: 10, fontFamily: "DMSans_400Regular", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  timerValue: { fontSize: 44, fontFamily: "DMSans_500Medium", letterSpacing: 3, lineHeight: 52 },
  timerAmount: { fontSize: 20, fontFamily: "DMSans_500Medium", marginTop: 8 },
  timerAmountLabel: { fontSize: 10, fontFamily: "DMSans_400Regular", marginTop: 3 },
  progressBarWrap: { borderRadius: 4, height: 4, width: "80%", marginTop: 14, marginBottom: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  cardSectionLabel: { fontSize: 10, fontFamily: "DMSans_400Regular", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 },
  linhaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 1 },
  linhaLabel: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  linhaValor: { fontSize: 12, fontFamily: "DMSans_500Medium" },
  toolRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toolIcon: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  toolNome: { fontSize: 12, fontFamily: "Sora_600SemiBold" },
  toolTipo: { fontSize: 10, fontFamily: "DMSans_400Regular", marginTop: 1 },
  servicoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  servicoIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  servicoNome: { fontSize: 13, fontFamily: "Sora_600SemiBold" },
  servicoMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  servicoMetaText: { fontSize: 10, fontFamily: "DMSans_400Regular" },
  servicoRate: { fontSize: 13, fontFamily: "DMSans_500Medium" },
  pagamentoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pagamentoIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pagamentoLabel: { fontSize: 13, fontFamily: "Sora_600SemiBold" },
  pagamentoSub: { fontSize: 10, fontFamily: "DMSans_400Regular", marginTop: 2 },
  avaliacaoTitulo: { color: "#e06030", fontSize: 12, fontFamily: "Sora_700Bold", marginBottom: 4 },
  avaliacaoSub: { fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 16, lineHeight: 16 },
  starsRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 16 },
  avaliacaoBtn: { backgroundColor: "#e06030", borderRadius: 12, padding: 13, alignItems: "center" },
  avaliacaoBtnText: { color: "#fff", fontSize: 13, fontFamily: "Sora_600SemiBold" },
  encerrarBtn: { borderWidth: 1, borderRadius: 14, padding: 15, alignItems: "center", marginBottom: 10 },
  encerrarBtnText: { color: "#e06030", fontSize: 12, fontFamily: "DMSans_400Regular", letterSpacing: 1, textTransform: "uppercase" },
  contratarNovBtn: { backgroundColor: "#e0603015", borderWidth: 1, borderColor: "#e0603030", borderRadius: 14, padding: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 10 },
  contratarNovText: { color: "#e06030", fontSize: 13, fontFamily: "Sora_600SemiBold" },
  suporteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 4 },
  suporteBtnText: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  sheetTitle: { fontSize: 16, fontFamily: "Sora_700Bold", marginBottom: 4 },
  sheetSubtitle: { fontSize: 11, fontFamily: "DMSans_400Regular" },
  supportOptionIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  supportOptionLabel: { fontSize: 13, fontFamily: "Sora_600SemiBold", marginBottom: 3 },
  supportOptionDesc: { fontSize: 11, fontFamily: "DMSans_400Regular", lineHeight: 16 },
  sheetDivider: { borderTopWidth: 1, paddingTop: 16, marginBottom: 12 },
  sheetDividerLabel: { fontSize: 10, fontFamily: "DMSans_400Regular", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 },
  suporteHumanoBtn: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 20, padding: 16 },
});
