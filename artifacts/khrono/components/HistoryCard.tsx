import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { Contract } from "@/context/ContractsContext";

type Props = {
  contract: Contract;
  onPress?: () => void;
};

function formatDuration(startedAt: number, endedAt?: number) {
  if (!endedAt) return "-";
  const ms = endedAt - startedAt;
  const totalMins = Math.floor(ms / 1000 / 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function HistoryCard({ contract, onPress }: Props) {
  const { colors } = useTheme();
  const isHiring = contract.role === "hiring";
  const accentColor = isHiring ? Colors.accent : Colors.accentGreen;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.menuIconBg }]}>
        <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
          {contract.person.initials}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textSecondary }]}>{contract.person.name}</Text>
        <Text style={[styles.skill, { color: colors.textDim }]}>
          {contract.person.skill} · {formatDuration(contract.startedAt, contract.endedAt)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.textSecondary }]}>
          R${contract.totalAmount?.toFixed(0)}
        </Text>
        <Text style={[styles.roleTag, { color: isHiring ? colors.textMuted : Colors.accentGreen + "99" }]}>
          {isHiring ? "pago" : "recebido"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: "Sora_400Regular",
    fontSize: 12,
  },
  skill: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
  },
  amount: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
  },
  roleTag: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
