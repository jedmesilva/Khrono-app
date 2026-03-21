import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { Contract } from "@/context/ContractsContext";

type Props = {
  contract: Contract;
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

export function HistoryCard({ contract }: Props) {
  const isHiring = contract.role === "hiring";
  const accentColor = isHiring ? Colors.accent : Colors.accentGreen;

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: "#161616" }]}>
        <Text style={styles.avatarText}>{contract.person.initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{contract.person.name}</Text>
        <Text style={styles.skill}>
          {contract.person.skill} · {formatDuration(contract.startedAt, contract.endedAt)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>R${contract.totalAmount?.toFixed(0)}</Text>
        <Text style={[styles.roleTag, { color: isHiring ? "#555" : Colors.accentGreen + "99" }]}>
          {isHiring ? "pago" : "recebido"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
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
    color: "#555",
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: "Sora_400Regular",
    fontSize: 12,
    color: "#666",
  },
  skill: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
  },
  amount: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    color: "#555",
  },
  roleTag: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
