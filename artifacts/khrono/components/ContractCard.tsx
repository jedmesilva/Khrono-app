import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { Contract } from "@/context/ContractsContext";

function getValueLabel(contract: Contract): string {
  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const isCash = contract.paymentMethod === "dinheiro";
  const isCardOrPix = contract.paymentMethod === "cartao" || contract.paymentMethod === "pix";

  if (contract.status === "ended") {
    return isHiring ? "PAGO" : "RECEBIDO";
  }

  if (contract.status === "pending_signature" || contract.status === "accepted" || contract.status === "paused") {
    return isHiring ? "A PAGAR" : "A RECEBER";
  }

  if (isHiring) {
    if (isCash) return "A PAGAR";
    if (isCardOrPix && isTimer) return "PAGANDO";
    if (isCardOrPix && !isTimer) return "A PAGAR";
    return "PAGANDO";
  } else {
    if (isCash) return "A RECEBER";
    if (isCardOrPix) return "RECEBENDO";
    return "RECEBENDO";
  }
}

type Props = {
  contract: Contract;
  onStop?: (id: string) => void;
  onAccept?: (id: string) => void;
  onBegin?: (id: string) => void;
  onPress?: () => void;
};

function formatElapsed(ms: number) {
  const totalSecs = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


function formatValue(ms: number, rate: number) {
  const hours = ms / 1000 / 3600;
  return (hours * rate).toFixed(2);
}


export function ContractCard({ contract, onStop, onAccept, onBegin, onPress }: Props) {
  const [now, setNow] = useState(Date.now());
  const { colors } = useTheme();
  const isScheduled = !!contract.agendado;
  const isActive = contract.status === "active";
  const isPending = contract.status === "pending_signature";
  const isAccepted = contract.status === "accepted";

  useEffect(() => {
    if (isScheduled || !isActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isScheduled, isActive]);

  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const accentColor = colors.accent;
  const elapsed = isScheduled || !isActive ? 0 : now - contract.startedAt;

  const restante = isTimer && contract.duracaoTotal
    ? Math.max(0, contract.duracaoTotal - elapsed)
    : null;
  const progresso = isTimer && contract.duracaoTotal
    ? Math.min(1, elapsed / contract.duracaoTotal)
    : null;
  const quaseAcabando = !isScheduled && isTimer && restante !== null && restante < 1000 * 60 * 10;
  const alertColor = "#ff4444";

  const displayColor = quaseAcabando ? alertColor : accentColor;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          borderLeftColor: displayColor,
          borderLeftWidth: 3,
        },
      ]}
    >
      {/* Badges row: role + tipo */}
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.roleBadge,
            {
              backgroundColor: accentColor + "12",
              borderColor: accentColor + "30",
            },
          ]}
        >
          {isScheduled ? (
            <Feather name="calendar" size={8} color={accentColor} />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: displayColor }]} />
          )}
          <Text style={[styles.roleText, { color: accentColor }]}>
            {isHiring ? "VOCÊ CONTRATOU" : "VOCÊ FOI CONTRATADO"}
          </Text>
        </View>
        <View style={[styles.tipoBadge, { borderColor: colors.text + "10", backgroundColor: colors.text + "05" }]}>
          <Text style={[styles.tipoText, { color: colors.textSecondary }]}>
            {isTimer ? "TEMPO DEFINIDO" : "EM ABERTO"}
          </Text>
        </View>
      </View>

      {/* Person */}
      <View style={styles.personRow}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: accentColor + "15", borderColor: accentColor + "40" },
          ]}
        >
          <Text style={[styles.avatarText, { color: accentColor }]}>
            {contract.person.initials}
          </Text>
        </View>
        <View style={styles.personInfo}>
          <Text style={[styles.personName, { color: colors.text }]}>{contract.person.name}</Text>
          {(contract.servico?.nome ?? contract.person.skill) ? (
            <Text style={[styles.servicoLabel, { color: colors.textSecondary }]}>
              {contract.servico?.nome ?? contract.person.skill}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Timer mode: progress bar + countdown */}
      {isTimer && contract.duracaoTotal ? (
        <View>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceBorder }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(progresso ?? 0) * 100}%` as any,
                  backgroundColor: quaseAcabando ? alertColor : accentColor,
                },
              ]}
            />
          </View>
          <View style={styles.timerRow}>
            <View>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>RESTANTE</Text>
              <Text style={[styles.timerText, { color: quaseAcabando ? alertColor : colors.text }]}>
                {formatElapsed(restante ?? 0)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{getValueLabel(contract)}</Text>
              <Text style={[styles.valueText, { color: displayColor }]}>
                R${formatValue(contract.duracaoTotal, contract.ratePerHour)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        /* Cronometro mode: elapsed + accumulated value + status pill */
        <View style={styles.timerRow}>
          <View>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>TEMPO</Text>
            <Text style={[styles.timerText, { color: colors.text }]}>
              {isPending || isAccepted ? "00:00:00" : formatElapsed(elapsed)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{getValueLabel(contract)}</Text>
            <Text style={[styles.valueText, { color: isPending || isAccepted ? colors.textMuted : displayColor }]}>
              {isPending || isAccepted ? "R$0,00" : `R$${formatValue(elapsed, contract.ratePerHour)}`}
            </Text>
          </View>
        </View>
      )}

      {/* Scheduled label */}
      {isScheduled && (
        <View style={styles.scheduledRow}>
          <Feather name="calendar" size={10} color={accentColor + "80"} />
          <Text style={[styles.scheduledText, { color: accentColor + "99" }]}>
            {contract.agendadoLabel ? `Inicia em ${contract.agendadoLabel}` : "Agendado"}
          </Text>
        </View>
      )}

      {/* Rate */}
      <View style={styles.rateRow}>
        <Text style={[styles.rateText, { color: colors.textDim }]}>R${contract.ratePerHour}/h</Text>
      </View>

      {/* Botão: Aceitar contrato (pending_signature + hired) */}
      {isPending && !isHiring && (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: accentColor }]}
          onPress={() => onAccept?.(contract.id)}
        >
          <Feather name="check" size={14} color="#fff" />
          <Text style={styles.actionBtnText}>Aceitar contrato</Text>
        </Pressable>
      )}

      {/* Indicador: aguardando aceite (pending_signature + hiring) */}
      {isPending && isHiring && (
        <View style={[styles.waitingRow, { borderColor: accentColor + "25", backgroundColor: accentColor + "08" }]}>
          <Feather name="clock" size={12} color={accentColor + "99"} />
          <Text style={[styles.waitingText, { color: accentColor + "99" }]}>
            Aguardando aceite do contratado
          </Text>
        </View>
      )}

      {/* Botão: Iniciar contrato (accepted) */}
      {isAccepted && (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: accentColor }]}
          onPress={() => onBegin?.(contract.id)}
        >
          <Feather name="play" size={14} color="#fff" />
          <Text style={styles.actionBtnText}>Iniciar contrato</Text>
        </Pressable>
      )}

    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tipoBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  tipoText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    fontWeight: "700",
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
  },
  servicoLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  metaLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  timerText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 30,
    letterSpacing: 2,
    lineHeight: 34,
  },
  valueText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 22,
    letterSpacing: 1,
    lineHeight: 26,
  },
  scheduledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: -4,
  },
  scheduledText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  rateRow: {
    marginBottom: 16,
  },
  rateText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
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
  },
  waitingText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  stopBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stopText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-end",
  },
  statusPillText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
  },
});
