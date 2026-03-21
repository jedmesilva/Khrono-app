import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HistoryCard } from "@/components/HistoryCard";
import { PixWithdrawModal } from "@/components/PixWithdrawModal";
import Colors from "@/constants/colors";
import { useContracts } from "@/context/ContractsContext";

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { history } = useContracts();
  const [pixModalVisible, setPixModalVisible] = useState(false);

  const totalReceived = history
    .filter((h) => h.role === "hired")
    .reduce((sum, h) => sum + (h.totalAmount || 0), 0);

  const totalPaid = history
    .filter((h) => h.role === "hiring")
    .reduce((sum, h) => sum + (h.totalAmount || 0), 0);

  const topPadding = isWeb ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding + 20,
            paddingBottom: isWeb ? 34 + 84 + 20 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            K<Text style={{ color: Colors.accent }}>r</Text>ono
          </Text>
          <Text style={styles.subtitle}>carteira</Text>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>SALDO DISPONÍVEL</Text>
          <Text style={styles.balanceAmount}>
            R$ {totalReceived.toFixed(2).replace(".", ",")}
          </Text>

          {/* Pix withdraw button */}
          <Pressable
            style={styles.pixBtn}
            onPress={() => setPixModalVisible(true)}
          >
            <View style={styles.pixIconWrap}>
              <Feather name="zap" size={14} color={Colors.accentGreen} />
            </View>
            <Text style={styles.pixBtnText}>Sacar via Pix</Text>
            <Feather name="chevron-right" size={14} color={Colors.accentGreen + "80"} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Feather name="arrow-up-right" size={16} color={Colors.accent} />
            </View>
            <Text style={styles.statLabel}>TOTAL PAGO</Text>
            <Text style={[styles.statAmount, { color: Colors.accent }]}>
              R${totalPaid.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: Colors.accentGreen + "15" }]}>
              <Feather name="arrow-down-left" size={16} color={Colors.accentGreen} />
            </View>
            <Text style={styles.statLabel}>TOTAL RECEBIDO</Text>
            <Text style={[styles.statAmount, { color: Colors.accentGreen }]}>
              R${totalReceived.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionLabel}>HISTÓRICO DE TRANSAÇÕES</Text>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={32} color="#333" />
            <Text style={styles.emptyText}>nenhuma transação ainda</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {history.map((h) => (
              <HistoryCard key={h.id} contract={h} />
            ))}
          </View>
        )}
      </ScrollView>

      <PixWithdrawModal
        visible={pixModalVisible}
        balance={totalReceived}
        onClose={() => setPixModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: "#fff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  balanceCard: {
    backgroundColor: Colors.accent + "10",
    borderWidth: 1,
    borderColor: Colors.accent + "30",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  balanceLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#888",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  balanceAmount: {
    fontFamily: "DMMono_500Medium",
    fontSize: 36,
    color: "#fff",
    letterSpacing: 1,
    marginBottom: 8,
  },
  pixBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accentGreen + "12",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "30",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pixIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.accentGreen + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  pixBtnText: {
    flex: 1,
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: Colors.accentGreen,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.accent + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 8,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  statAmount: {
    fontFamily: "DMMono_500Medium",
    fontSize: 18,
  },
  sectionLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#333",
  },
  list: { gap: 8 },
});
