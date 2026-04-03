import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { Contract } from "@/context/ContractsContext";

type Props = {
  contract: Contract;
  onStop: (id: string) => void;
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

function PulseIndicator({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View style={[styles.pulse, { backgroundColor: color, opacity }]} />
  );
}

export function ContractCard({ contract, onStop, onPress }: Props) {
  const [now, setNow] = useState(Date.now());
  const isScheduled = !!contract.agendado;

  useEffect(() => {
    if (isScheduled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isScheduled]);

  const isHiring = contract.role === "hiring";
  const isTimer = contract.tipo === "timer";
  const accentColor = isHiring ? Colors.accent : Colors.accentGreen;
  const elapsed = isScheduled ? 0 : now - contract.startedAt;

  const restante = isTimer && contract.duracaoTotal
    ? Math.max(0, contract.duracaoTotal - elapsed)
    : null;
  const progresso = isTimer && contract.duracaoTotal
    ? Math.min(1, elapsed / contract.duracaoTotal)
    : null;
  const quaseAcabando = !isScheduled && isTimer && restante !== null && restante < 1000 * 60 * 10;
  const alertColor = "#ff4444";

  const stopScale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(stopScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(stopScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onStop(contract.id);
  };

  const displayColor = quaseAcabando ? alertColor : accentColor;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: isHiring ? "#0a0a0a" : "#060f1a",
          borderColor: isHiring ? "#1e1e1e" : "#0d1f35",
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
            <PulseIndicator color={displayColor} />
          )}
          <Text style={[styles.roleText, { color: accentColor }]}>
            {isHiring ? "VOCÊ CONTRATOU" : "VOCÊ FOI CONTRATADO"}
          </Text>
        </View>
        <View style={styles.tipoBadge}>
          <Text style={styles.tipoText}>
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
          <Text style={styles.personName}>{contract.person.name}</Text>
          <Text style={styles.personSkill}>{contract.person.skill}</Text>
        </View>
      </View>

      {/* Timer mode: progress bar + countdown */}
      {isTimer && contract.duracaoTotal ? (
        <View>
          <View style={styles.progressTrack}>
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
              <Text style={styles.metaLabel}>RESTANTE</Text>
              <Text style={[styles.timerText, { color: quaseAcabando ? alertColor : "#fff" }]}>
                {formatElapsed(restante ?? 0)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.metaLabel}>VALOR TOTAL</Text>
              <Text style={[styles.valueText, { color: displayColor }]}>
                R${formatValue(contract.duracaoTotal, contract.ratePerHour)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        /* Cronometro mode: elapsed + accumulated */
        <View style={styles.timerRow}>
          <View>
            <Text style={styles.metaLabel}>TEMPO</Text>
            <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.metaLabel}>ACUMULADO</Text>
            <Text style={[styles.valueText, { color: accentColor }]}>
              R${formatValue(elapsed, contract.ratePerHour)}
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
        <Text style={styles.rateText}>R${contract.ratePerHour}/h</Text>
      </View>

      {/* Stop button */}
      <Animated.View style={{ transform: [{ scale: stopScale }] }}>
        <Pressable
          style={[
            styles.stopBtn,
            { borderColor: (quaseAcabando ? alertColor : accentColor) + "40" },
          ]}
          onPress={handlePress}
        >
          <Feather name="square" size={12} color={quaseAcabando ? alertColor : accentColor} />
          <Text style={[styles.stopText, { color: quaseAcabando ? alertColor : accentColor }]}>
            ENCERRAR
          </Text>
        </Pressable>
      </Animated.View>
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
    borderColor: "#ffffff10",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ffffff05",
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  tipoText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
    color: "#555",
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
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    fontWeight: "700",
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  personSkill: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#1a1a1a",
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
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  timerText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 30,
    color: "#fff",
    letterSpacing: 2,
    lineHeight: 34,
  },
  valueText: {
    fontFamily: "DMMono_500Medium",
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
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  rateRow: {
    marginBottom: 16,
  },
  rateText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
    letterSpacing: 0.5,
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
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
