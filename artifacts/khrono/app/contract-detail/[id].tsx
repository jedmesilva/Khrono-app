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
import { Contract, useContracts } from "@/context/ContractsContext";

function getDetailValueLabel(contract: Contract): string {
  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const isCash = contract.paymentMethod === "dinheiro";
  const isCardOrPix = contract.paymentMethod === "cartao" || contract.paymentMethod === "pix";

  if (contract.status === "ended") {
    return isHiring ? "pago" : "recebido";
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

const FAQS = [
  { q: "O contratado não apareceu, o que fazer?", r: "Se o contratado não apareceu no horário combinado, você pode encerrar o contrato sem custo. Entre em contato conosco para análise do caso e eventual reembolso." },
  { q: "Fui cobrado um valor incorreto", r: "O valor é calculado automaticamente pelo cronômetro. Se acredita que houve erro, entre em contato informando o ID do contrato e detalharemos o cálculo." },
  { q: "Como cancelar um contrato ativo?", r: "Você pode encerrar o contrato a qualquer momento pelo botão abaixo. O valor cobrado será proporcional ao tempo decorrido." },
  { q: "Não consigo avaliar o contratado", r: "A avaliação fica disponível por 7 dias após o encerramento. Se o prazo não venceu e ainda não consegue avaliar, entre em contato." },
];

export default function ContractDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeContracts, history, endContract } = useContracts();

  const contract = [...activeContracts, ...history].find(c => c.id === id);

  const [now, setNow] = useState(Date.now());
  const [notaSelecionada, setNotaSelecionada] = useState(0);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [suporteAberto, setSuporteAberto] = useState(false);
  const [faqAberto, setFaqAberto] = useState<number | null>(null);
  const [faqExpandido, setFaqExpandido] = useState(false);
  const [confirmEncerrar, setConfirmEncerrar] = useState(false);

  const suporteRef = useRef<BottomSheetModal>(null);
  const suporteSnapPoints = useMemo(() => ["75%"], []);
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
    if (!contract || contract.status !== "active" || contract.agendado) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [contract?.status, contract?.agendado]);

  if (!contract) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={20} color="#ff6b35" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>K<Text style={{ color: "#ff6b35" }}>r</Text>ono</Text>
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
  const isScheduled = isActive && !!contract.agendado;
  const cor = isHiring ? "#ff6b35" : "#18a06b";

  const elapsed = isScheduled ? 0 : isActive ? now - contract.startedAt : (contract.endedAt! - contract.startedAt);
  const tempoDecorrido = elapsed;
  const valorHora = contract.ratePerHour;

  const valorAcumulado = isTimer && contract.duracaoTotal
    ? ((contract.duracaoTotal / 1000 / 3600) * valorHora).toFixed(2)
    : ((tempoDecorrido / 1000 / 3600) * valorHora).toFixed(2);

  const restante = isTimer && isActive && !isScheduled && contract.duracaoTotal
    ? Math.max(0, contract.duracaoTotal - elapsed)
    : null;
  const progresso = isTimer && isActive && !isScheduled && contract.duracaoTotal
    ? Math.min(1, elapsed / contract.duracaoTotal)
    : null;

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

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={20} color="#ff6b35" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>K<Text style={{ color: "#ff6b35" }}>r</Text>ono</Text>
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
            isActive
              ? { backgroundColor: "#18a06b10", borderColor: "#18a06b25" }
              : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}>
            <View style={[styles.statusDot, { backgroundColor: isScheduled ? cor : isActive ? "#18a06b" : colors.textMuted }]} />
            <Text style={[styles.statusText, { color: isScheduled ? cor : isActive ? "#18a06b" : colors.textSecondary }]}>
              {isScheduled ? "agendado" : isActive ? "em andamento" : "encerrado"}
            </Text>
          </View>
          <Text style={[styles.contratoId, { color: colors.textMuted }]}>{contratoId}</Text>
        </View>

        {/* Pessoa */}
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
            <View style={[styles.roleBadge, { backgroundColor: cor + "15", borderColor: cor + "30" }]}>
              <Text style={[styles.roleText, { color: cor }]}>
                {isHiring ? "você contratou" : "você foi contratado"}
              </Text>
            </View>
          </View>
          {contract.person.profileId && (
            <Pressable
              onPress={() => router.push(`/user-profile/${contract.person.profileId}` as any)}
              style={[styles.verPerfilBtn, { borderTopColor: colors.surface }]}
            >
              <Feather name="user" size={11} color={"#ff6b3599"} />
              <Text style={styles.verPerfilText}>ver perfil completo</Text>
              <Feather name="chevron-right" size={11} color={"#ff6b3560"} />
            </Pressable>
          )}
        </View>

        {/* Cronômetro / Timer */}
        {isActive && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: cor + "20", alignItems: "center", marginBottom: 12 }]}>
            {isTimer ? (
              <>
                <Text style={[styles.timerLabel, { color: colors.textMuted }]}>tempo restante</Text>
                <Text style={[styles.timerValue, { color: colors.text }, !isScheduled && (restante ?? 0) < 600000 && { color: "#ff4444" }]}>
                  {formatTimer(Math.floor((restante ?? contract.duracaoTotal ?? 0) / 1000))}
                </Text>
                <View style={[styles.progressBarWrap, { backgroundColor: colors.surface }]}>
                  <View style={[styles.progressFill, { width: `${Math.round((progresso ?? 0) * 100)}%` as any, backgroundColor: !isScheduled && (restante ?? 0) < 600000 ? "#ff4444" : cor }]} />
                </View>
                <Text style={[styles.timerAmount, { color: cor }]}>R${valorAcumulado}</Text>
                <Text style={[styles.timerAmountLabel, { color: colors.textMuted }]}>{getDetailValueLabel(contract)}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.timerLabel, { color: colors.textMuted }]}>tempo decorrido</Text>
                <Text style={[styles.timerValue, { color: colors.text }]}>{formatTimer(Math.floor(elapsed / 1000))}</Text>
                <Text style={[styles.timerAmount, { color: cor }]}>R${valorAcumulado}</Text>
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
                      <Feather name="star" size={10} color="#ff6b35" />
                      <Text style={[styles.servicoMetaText, { color: colors.textSecondary }]}>
                        {contract.servico.nota} · {contract.servico.avaliacoes} avaliações
                      </Text>
                    </View>
                  )}
                  {contract.servico.skill && (
                    <View style={styles.servicoMeta}>
                      <Feather name="tool" size={9} color="#ff6b3599" />
                      <Text style={[styles.servicoMetaText, { color: "#ff6b3599" }]}>{contract.servico.skill}</Text>
                    </View>
                  )}
                  {contract.servico.tools && contract.servico.tools.length > 0 && (
                    <View style={styles.servicoMeta}>
                      <Feather name="key" size={9} color="#18a06b99" />
                      <Text style={[styles.servicoMetaText, { color: "#18a06b99" }]} numberOfLines={1}>
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
              ...(contract.agendado && contract.agendadoLabel ? [{ label: "Agendado para", valor: contract.agendadoLabel, corValor: undefined }] : []),
              ...(!contract.agendado ? [{ label: "Início imediato", valor: "Agora", corValor: undefined }] : []),
              ...(!isActive ? [
                { label: "Duração", valor: formatTimer(Math.floor(tempoDecorrido / 1000)), corValor: undefined },
                { label: isHiring ? "Total pago" : "Total recebido", valor: `R$${valorAcumulado}`, corValor: cor },
              ] : []),
              { label: "Início", valor: formatData(contract.startedAt), corValor: undefined },
              ...(contract.endedAt ? [{ label: "Encerramento", valor: formatData(contract.endedAt), corValor: undefined }] : []),
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
              <View style={[styles.pagamentoIconWrap, { borderColor: "#ff6b3540" }]}>
                <Feather
                  name={contract.paymentMethod === "cartao" ? "credit-card" : contract.paymentMethod === "pix" ? "zap" : "dollar-sign"}
                  size={15}
                  color="#ff6b35"
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

        {/* Avaliação pendente */}
        {!isActive && isHiring && !avaliacaoEnviada && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: "#ff6b3530", marginBottom: 12 }]}>
            <Text style={styles.avaliacaoTitulo}>Avaliação pendente</Text>
            <Text style={[styles.avaliacaoSub, { color: colors.textSecondary }]}>Como foi sua experiência com {contract.person.name}?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotaSelecionada(n); }} hitSlop={4}>
                  <MaterialCommunityIcons name={n <= notaSelecionada ? "star" : "star-outline"} size={32} color="#ff6b35" />
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
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: "#18a06b30", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }]}>
            <Feather name="check-circle" size={16} color="#18a06b" />
            <Text style={{ color: "#18a06b", fontSize: 13, fontFamily: "Sora_600SemiBold" }}>Avaliação enviada!</Text>
          </View>
        )}

        {/* Ações */}
        {isActive && (
          <Pressable onPress={handleEncerrar} style={[styles.encerrarBtn, { borderColor: "#ff6b3540" }]}>
            <Text style={styles.encerrarBtnText}>■  encerrar contrato</Text>
          </Pressable>
        )}

        {!isActive && (
          <Pressable onPress={() => router.back()} style={styles.contratarNovBtn}>
            <Feather name="rotate-ccw" size={15} color="#ff6b35" />
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
        onDismiss={() => { setSuporteAberto(false); setFaqAberto(null); setFaqExpandido(false); }}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: insets.bottom + 24 }}
        >
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Ajuda</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>{contratoId}</Text>
            </View>
            <Pressable onPress={() => { setSuporteAberto(false); setFaqAberto(null); setFaqExpandido(false); }} hitSlop={8}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={{ gap: 10, marginBottom: 20 }}>
            {[
              { icon: <Feather name="file-text" size={20} color="#ff6b35" />, label: "Perguntas frequentes", desc: "Respostas para as dúvidas mais comuns", onPress: () => setFaqExpandido(f => !f) },
              { icon: <MaterialCommunityIcons name="robot-outline" size={20} color="#ff6b35" />, label: "Falar com a AI", desc: "Assistente inteligente com contexto do contrato", onPress: () => {} },
              { icon: <Feather name="message-circle" size={20} color="#ff6b35" />, label: "Falar com suporte humano", desc: "Para casos que precisam de atenção especial", onPress: () => {} },
            ].map(op => (
              <Pressable
                key={op.label}
                onPress={op.onPress}
                style={[styles.supportOption, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={[styles.supportOptionIcon, { backgroundColor: "#ff6b3515", borderColor: "#ff6b3525" }]}>
                  {op.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.supportOptionLabel, { color: colors.text }]}>{op.label}</Text>
                  <Text style={[styles.supportOptionDesc, { color: colors.textSecondary }]}>{op.desc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.chevron} />
              </Pressable>
            ))}
          </View>

          {faqExpandido && (
            <View>
              <Text style={[styles.faqSectionLabel, { color: colors.textMuted }]}>perguntas frequentes</Text>
              <View style={{ gap: 8 }}>
                {FAQS.map((f, i) => (
                  <View key={i} style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <Pressable onPress={() => setFaqAberto(faqAberto === i ? null : i)} style={styles.faqQuestion}>
                      <Text style={[styles.faqQuestionText, { color: colors.textSecondary }, faqAberto === i && { color: colors.text }]}>
                        {f.q}
                      </Text>
                      <Feather name="chevron-right" size={14} color={colors.chevron} style={{ transform: [{ rotate: faqAberto === i ? "90deg" : "0deg" }] }} />
                    </Pressable>
                    {faqAberto === i && (
                      <View style={[styles.faqAnswer, { borderTopColor: colors.surface }]}>
                        <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>{f.r}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
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
  verPerfilText: { fontFamily: "DMSans_400Regular", fontSize: 11, flex: 1, color: "#ff6b3599" },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 16, fontFamily: "DMSans_500Medium" },
  pessoaNome: { fontSize: 15, fontFamily: "Sora_700Bold", marginBottom: 6 },
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
  avaliacaoTitulo: { color: "#ff6b35", fontSize: 12, fontFamily: "Sora_700Bold", marginBottom: 4 },
  avaliacaoSub: { fontSize: 11, fontFamily: "DMSans_400Regular", marginBottom: 16, lineHeight: 16 },
  starsRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 16 },
  avaliacaoBtn: { backgroundColor: "#ff6b35", borderRadius: 12, padding: 13, alignItems: "center" },
  avaliacaoBtnText: { color: "#fff", fontSize: 13, fontFamily: "Sora_600SemiBold" },
  encerrarBtn: { borderWidth: 1, borderRadius: 14, padding: 15, alignItems: "center", marginBottom: 10 },
  encerrarBtnText: { color: "#ff6b35", fontSize: 12, fontFamily: "DMSans_400Regular", letterSpacing: 1, textTransform: "uppercase" },
  contratarNovBtn: { backgroundColor: "#ff6b3515", borderWidth: 1, borderColor: "#ff6b3530", borderRadius: 14, padding: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 10 },
  contratarNovText: { color: "#ff6b35", fontSize: 13, fontFamily: "Sora_600SemiBold" },
  suporteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 4 },
  suporteBtnText: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  sheetTitle: { fontSize: 16, fontFamily: "Sora_700Bold", marginBottom: 4 },
  sheetSubtitle: { fontSize: 11, fontFamily: "DMSans_400Regular" },
  supportOption: { borderWidth: 1, borderRadius: 24, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  supportOptionIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  supportOptionLabel: { fontSize: 13, fontFamily: "Sora_600SemiBold", marginBottom: 3 },
  supportOptionDesc: { fontSize: 11, fontFamily: "DMSans_400Regular", lineHeight: 16 },
  faqSectionLabel: { fontSize: 10, fontFamily: "DMSans_400Regular", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 },
  faqItem: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  faqQuestion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, gap: 12 },
  faqQuestionText: { fontSize: 12, fontFamily: "Sora_600SemiBold", flex: 1, lineHeight: 18 },
  faqAnswer: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 12, borderTopWidth: 1 },
  faqAnswerText: { fontSize: 12, fontFamily: "DMSans_400Regular", lineHeight: 19 },
});
