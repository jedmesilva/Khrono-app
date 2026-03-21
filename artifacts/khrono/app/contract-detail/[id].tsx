import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useContracts } from "@/context/ContractsContext";

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
  { q: "O prestador não apareceu, o que fazer?", r: "Se o prestador não apareceu no horário combinado, você pode encerrar o contrato sem custo. Entre em contato conosco para análise do caso e eventual reembolso." },
  { q: "Fui cobrado um valor incorreto", r: "O valor é calculado automaticamente pelo cronômetro. Se acredita que houve erro, entre em contato informando o ID do contrato e detalharemos o cálculo." },
  { q: "Como cancelar um contrato ativo?", r: "Você pode encerrar o contrato a qualquer momento pelo botão abaixo. O valor cobrado será proporcional ao tempo decorrido." },
  { q: "Não consigo avaliar o prestador", r: "A avaliação fica disponível por 7 dias após o encerramento. Se o prazo não venceu e ainda não consegue avaliar, entre em contato." },
];

function Linha({ label, valor, corValor }: { label: string; valor: string; corValor?: string }) {
  return (
    <View style={styles.linhaRow}>
      <Text style={styles.linhaLabel}>{label}</Text>
      <Text style={[styles.linhaValor, corValor ? { color: corValor } : {}]}>{valor}</Text>
    </View>
  );
}

export default function ContractDetailScreen() {
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

  useEffect(() => {
    if (!contract || contract.status !== "active") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [contract?.status]);

  if (!contract) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={20} color={Colors.accent} />
          </Pressable>
          <Text style={styles.headerTitle}>K<Text style={{ color: Colors.accent }}>r</Text>ono</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#444", fontFamily: "DMMono_400Regular", fontSize: 12 }}>Contrato não encontrado</Text>
        </View>
      </View>
    );
  }

  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const isActive = contract.status === "active";
  const cor = isHiring ? Colors.accent : Colors.accentGreen;

  const elapsed = now - contract.startedAt;
  const tempoDecorrido = isActive ? elapsed : (contract.endedAt! - contract.startedAt);
  const valorHora = contract.ratePerHour;

  const valorAcumulado = isTimer && contract.duracaoTotal
    ? ((contract.duracaoTotal / 1000 / 3600) * valorHora).toFixed(2)
    : ((tempoDecorrido / 1000 / 3600) * valorHora).toFixed(2);

  const restante = isTimer && isActive && contract.duracaoTotal
    ? Math.max(0, contract.duracaoTotal - elapsed)
    : null;
  const progresso = isTimer && isActive && contract.duracaoTotal
    ? Math.min(1, elapsed / contract.duracaoTotal)
    : null;

  const contratoId = `KRN-${contract.id.slice(-8).toUpperCase()}`;

  const handleEncerrar = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    endContract(contract.id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={20} color={Colors.accent} />
          </Pressable>
          <Text style={styles.headerTitle}>K<Text style={{ color: Colors.accent }}>r</Text>ono</Text>
        </View>
        <Pressable
          onPress={() => router.replace("/(tabs)" as any)}
          style={styles.homeBtn}
          hitSlop={12}
        >
          <Feather name="home" size={18} color="#444" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status badge + ID */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeEnded]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? Colors.accentGreen : "#444" }]} />
            <Text style={[styles.statusText, { color: isActive ? Colors.accentGreen : "#555" }]}>
              {isActive ? "em andamento" : "encerrado"}
            </Text>
          </View>
          <Text style={styles.contratoId}>{contratoId}</Text>
        </View>

        {/* Pessoa */}
        <View style={[styles.card, { borderColor: isHiring ? "#1e1e1e" : "#1a2d4a", marginBottom: 12 }]}>
          <View style={styles.pessoaRow}>
            <View style={[styles.avatar, { backgroundColor: cor + "20", borderColor: cor + "40" }]}>
              <Text style={[styles.avatarText, { color: cor }]}>{contract.person.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pessoaNome}>{contract.person.name}</Text>
              <View style={styles.pessoaMeta}>
                <Feather name="star" size={11} color={Colors.accent} />
                <Text style={styles.metaText}>
                  {contract.person.nota ?? "—"} ({contract.person.avaliacoes ?? "—"})
                </Text>
                <Feather name="map-pin" size={11} color="#444" />
                <Text style={[styles.metaText, { color: "#555" }]}>
                  {contract.person.distancia != null ? `${contract.person.distancia} km` : "—"}
                </Text>
              </View>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: cor + "15", borderColor: cor + "30" }]}>
              <Text style={[styles.roleText, { color: cor }]}>
                {isHiring ? "você contratou" : "você foi contratado"}
              </Text>
            </View>
          </View>
        </View>

        {/* Cronômetro / Timer — somente ativo */}
        {isActive && (
          <View style={[styles.card, { borderColor: cor + "20", alignItems: "center", marginBottom: 12 }]}>
            {isTimer ? (
              <>
                <Text style={styles.timerLabel}>tempo restante</Text>
                <Text style={[styles.timerValue, (restante ?? 0) < 600000 && { color: "#ff4444" }]}>
                  {formatTimer(Math.floor((restante ?? 0) / 1000))}
                </Text>
                <View style={styles.progressBarWrap}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${Math.round((progresso ?? 0) * 100)}%` as any,
                      backgroundColor: (restante ?? 0) < 600000 ? "#ff4444" : cor,
                    }
                  ]} />
                </View>
                <Text style={[styles.timerAmount, { color: cor }]}>R${valorAcumulado}</Text>
                <Text style={styles.timerAmountLabel}>valor total fixo</Text>
              </>
            ) : (
              <>
                <Text style={styles.timerLabel}>tempo decorrido</Text>
                <Text style={styles.timerValue}>{formatTimer(Math.floor(elapsed / 1000))}</Text>
                <Text style={[styles.timerAmount, { color: cor }]}>R${valorAcumulado}</Text>
                <Text style={styles.timerAmountLabel}>acumulado</Text>
              </>
            )}
          </View>
        )}

        {/* Detalhes */}
        <View style={[styles.card, { marginBottom: 12 }]}>
          <Text style={styles.cardSectionLabel}>detalhes</Text>
          <View style={{ gap: 12 }}>
            <Linha label="Skill" valor={contract.person.skill} />
            <Linha label="Tipo" valor={isTimer ? "Tempo definido" : "Tempo em aberto"} />
            <Linha label="Valor/hora" valor={`R$${valorHora.toFixed(0)}/h`} corValor={cor} />
            {!isActive && (
              <>
                <Linha label="Duração" valor={formatTimer(Math.floor(tempoDecorrido / 1000))} />
                <Linha
                  label={isHiring ? "Total pago" : "Total recebido"}
                  valor={`R$${valorAcumulado}`}
                  corValor={cor}
                />
              </>
            )}
            <Linha label="Início" valor={formatData(contract.startedAt)} />
            {contract.endedAt && (
              <Linha label="Encerramento" valor={formatData(contract.endedAt)} />
            )}
          </View>
        </View>

        {/* Tools */}
        {contract.tools && contract.tools.length > 0 && (
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Text style={styles.cardSectionLabel}>tools utilizadas</Text>
            <View style={{ gap: 8 }}>
              {contract.tools.map((t, i) => (
                <View key={i} style={styles.toolRow}>
                  <View style={styles.toolIcon}>
                    {t.tipo === "Veículo"
                      ? <MaterialCommunityIcons name="car-outline" size={14} color="#444" />
                      : <Feather name="tool" size={14} color="#444" />
                    }
                  </View>
                  <View>
                    <Text style={styles.toolNome}>{t.nome}</Text>
                    <Text style={styles.toolTipo}>{t.tipo}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Avaliação pendente */}
        {!isActive && isHiring && !avaliacaoEnviada && (
          <View style={[styles.card, { borderColor: Colors.accent + "30", marginBottom: 12 }]}>
            <Text style={styles.avaliacaoTitulo}>Avaliação pendente</Text>
            <Text style={styles.avaliacaoSub}>Como foi sua experiência com {contract.person.name}?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable
                  key={n}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotaSelecionada(n); }}
                  hitSlop={4}
                >
                  <MaterialCommunityIcons
                    name={n <= notaSelecionada ? "star" : "star-outline"}
                    size={32}
                    color={Colors.accent}
                  />
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={notaSelecionada === 0}
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setAvaliacaoEnviada(true); }}
              style={[styles.avaliacaoBtn, notaSelecionada === 0 && styles.avaliacaoBtnDisabled]}
            >
              <Text style={[styles.avaliacaoBtnText, notaSelecionada === 0 && { color: "#333" }]}>
                Enviar avaliação
              </Text>
            </Pressable>
          </View>
        )}

        {avaliacaoEnviada && (
          <View style={[styles.card, { borderColor: Colors.accentGreen + "30", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }]}>
            <Feather name="check-circle" size={16} color={Colors.accentGreen} />
            <Text style={{ color: Colors.accentGreen, fontSize: 13, fontFamily: "Sora_600SemiBold" }}>
              Avaliação enviada!
            </Text>
          </View>
        )}

        {/* Ações */}
        {isActive && (
          <Pressable onPress={handleEncerrar} style={styles.encerrarBtn}>
            <Text style={styles.encerrarBtnText}>■  encerrar contrato</Text>
          </Pressable>
        )}

        {!isActive && (
          <Pressable
            onPress={() => router.back()}
            style={styles.contratarNovBtn}
          >
            <Feather name="rotate-ccw" size={15} color={Colors.accent} />
            <Text style={styles.contratarNovText}>Contratar novamente</Text>
          </Pressable>
        )}

        {/* Suporte */}
        <Pressable onPress={() => setSuporteAberto(true)} style={styles.suporteBtn}>
          <Feather name="help-circle" size={15} color="#444" />
          <Text style={styles.suporteBtnText}>Preciso de ajuda com este contrato</Text>
        </Pressable>
      </ScrollView>

      {/* ── SUPPORT MODAL ── */}
      <Modal
        visible={suporteAberto}
        transparent
        animationType="slide"
        onRequestClose={() => { setSuporteAberto(false); setFaqAberto(null); setFaqExpandido(false); }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => { setSuporteAberto(false); setFaqAberto(null); setFaqExpandido(false); }}
          />
          <View style={[styles.supportSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Ajuda</Text>
                <Text style={styles.sheetSubtitle}>{contratoId}</Text>
              </View>
              <Pressable
                onPress={() => { setSuporteAberto(false); setFaqAberto(null); setFaqExpandido(false); }}
                hitSlop={8}
              >
                <Feather name="x" size={18} color="#444" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Support options */}
              <View style={{ gap: 10, marginBottom: 20 }}>
                {[
                  {
                    icon: <Feather name="file-text" size={20} color={Colors.accent} />,
                    label: "Perguntas frequentes",
                    desc: "Respostas para as dúvidas mais comuns",
                    onPress: () => setFaqExpandido(f => !f),
                  },
                  {
                    icon: <MaterialCommunityIcons name="robot-outline" size={20} color={Colors.accent} />,
                    label: "Falar com a AI",
                    desc: "Assistente inteligente com contexto do contrato",
                    onPress: () => {},
                  },
                  {
                    icon: <Feather name="message-circle" size={20} color={Colors.accent} />,
                    label: "Falar com suporte humano",
                    desc: "Para casos que precisam de atenção especial",
                    onPress: () => {},
                  },
                ].map(op => (
                  <Pressable
                    key={op.label}
                    onPress={op.onPress}
                    style={({ pressed }) => [styles.supportOption, pressed && { borderColor: Colors.accent + "30" }]}
                  >
                    <View style={styles.supportOptionIcon}>
                      {op.icon}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.supportOptionLabel}>{op.label}</Text>
                      <Text style={styles.supportOptionDesc}>{op.desc}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#2a2a2a" />
                  </Pressable>
                ))}
              </View>

              {/* FAQ accordion */}
              {faqExpandido && (
                <View>
                  <Text style={styles.faqSectionLabel}>perguntas frequentes</Text>
                  <View style={{ gap: 8 }}>
                    {FAQS.map((f, i) => (
                      <View key={i} style={styles.faqItem}>
                        <Pressable
                          onPress={() => setFaqAberto(faqAberto === i ? null : i)}
                          style={styles.faqQuestion}
                        >
                          <Text style={[styles.faqQuestionText, faqAberto === i && { color: "#fff" }]}>
                            {f.q}
                          </Text>
                          <Feather
                            name="chevron-right"
                            size={14}
                            color="#333"
                            style={{ transform: [{ rotate: faqAberto === i ? "90deg" : "0deg" }] }}
                          />
                        </Pressable>
                        {faqAberto === i && (
                          <View style={styles.faqAnswer}>
                            <Text style={styles.faqAnswerText}>{f.r}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  homeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Sora_700Bold",
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: Colors.accentGreen + "10",
    borderColor: Colors.accentGreen + "25",
  },
  statusBadgeEnded: {
    backgroundColor: "#ffffff08",
    borderColor: "#1e1e1e",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
  },
  contratoId: {
    color: "#2a2a2a",
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
  },
  card: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    padding: 18,
  },
  pessoaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "DMMono_500Medium",
  },
  pessoaNome: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Sora_700Bold",
    marginBottom: 4,
  },
  pessoaMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#666",
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  roleText: {
    fontSize: 9,
    fontFamily: "DMMono_400Regular",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  timerLabel: {
    color: "#444",
    fontSize: 10,
    fontFamily: "DMMono_400Regular",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 44,
    fontWeight: "700",
    fontFamily: "DMMono_500Medium",
    color: "#fff",
    letterSpacing: 3,
    lineHeight: 52,
  },
  timerAmount: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "DMMono_500Medium",
    marginTop: 8,
  },
  timerAmountLabel: {
    color: "#444",
    fontSize: 10,
    fontFamily: "DMMono_400Regular",
    marginTop: 3,
  },
  progressBarWrap: {
    backgroundColor: "#161616",
    borderRadius: 4,
    height: 4,
    width: "80%",
    marginTop: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  cardSectionLabel: {
    color: "#444",
    fontSize: 10,
    fontFamily: "DMMono_400Regular",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  linhaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  linhaLabel: {
    color: "#555",
    fontSize: 12,
    fontFamily: "DMMono_400Regular",
  },
  linhaValor: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "DMMono_500Medium",
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toolIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  toolNome: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Sora_600SemiBold",
  },
  toolTipo: {
    color: "#444",
    fontSize: 10,
    fontFamily: "DMMono_400Regular",
    marginTop: 1,
  },
  avaliacaoTitulo: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Sora_700Bold",
    marginBottom: 4,
  },
  avaliacaoSub: {
    color: "#555",
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
    marginBottom: 16,
    lineHeight: 16,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 16,
  },
  avaliacaoBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
  },
  avaliacaoBtnDisabled: {
    backgroundColor: "#1a1a1a",
  },
  avaliacaoBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Sora_600SemiBold",
  },
  encerrarBtn: {
    borderWidth: 1,
    borderColor: Colors.accent + "40",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  encerrarBtnText: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: "DMMono_400Regular",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  contratarNovBtn: {
    backgroundColor: Colors.accent + "15",
    borderWidth: 1,
    borderColor: Colors.accent + "30",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  contratarNovText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Sora_600SemiBold",
  },
  suporteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 14,
    padding: 13,
    marginTop: 4,
  },
  suporteBtnText: {
    color: "#444",
    fontSize: 12,
    fontFamily: "DMMono_400Regular",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  supportSheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#1e1e1e",
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: "85%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Sora_700Bold",
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: "#444",
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
  },
  supportOption: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  supportOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent + "15",
    borderWidth: 1,
    borderColor: Colors.accent + "25",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  supportOptionLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Sora_600SemiBold",
    marginBottom: 3,
  },
  supportOptionDesc: {
    color: "#555",
    fontSize: 11,
    fontFamily: "DMMono_400Regular",
    lineHeight: 16,
  },
  faqSectionLabel: {
    color: "#555",
    fontSize: 10,
    fontFamily: "DMMono_400Regular",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  faqItem: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 12,
  },
  faqQuestionText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Sora_600SemiBold",
    flex: 1,
    lineHeight: 18,
  },
  faqAnswer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#161616",
  },
  faqAnswerText: {
    color: "#555",
    fontSize: 12,
    fontFamily: "DMMono_400Regular",
    lineHeight: 19,
  },
});
