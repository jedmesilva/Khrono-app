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
import { useRouter } from "expo-router";

import { HistoryCard } from "@/components/HistoryCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useTheme } from "@/context/ThemeContext";
import { useContracts } from "@/context/ContractsContext";
import { formatCurrency } from "@/lib/format";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "recebido", label: "Recebidos" },
  { key: "pago", label: "Pagos" },
] as const;

type Filtro = "todos" | "recebido" | "pago";

export default function TransactionHistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { history } = useContracts();

  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filteredHistory = history.filter((h) => {
    if (filtro === "recebido") return h.role === "hired";
    if (filtro === "pago") return h.role === "hiring";
    return true;
  });

  const totalReceived = history
    .filter((h) => h.role === "hired")
    .reduce((sum, h) => sum + (h.totalAmount ?? 0), 0);

  const totalPaid = history
    .filter((h) => h.role === "hiring")
    .reduce((sum, h) => sum + (h.totalAmount ?? 0), 0);

  const topPadding = isWeb ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding }]}>
      <ScreenHeader title="Histórico de movimentações" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary chips */}
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryChip,
              { backgroundColor: "#e0603010", borderColor: "#e0603020" },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: "#e06030" }]}>
              TOTAL PAGO
            </Text>
            <Text style={[styles.summaryValue, { color: "#e06030" }]}>
              {formatCurrency(totalPaid)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryChip,
              { backgroundColor: "#18a06b10", borderColor: "#18a06b20" },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: "#18a06b" }]}>
              TOTAL RECEBIDO
            </Text>
            <Text style={[styles.summaryValue, { color: "#18a06b" }]}>
              {formatCurrency(totalReceived)}
            </Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                filtro === f.key && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => setFiltro(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  filtro === f.key && { color: "#fff" },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textMuted }]}>
              {filteredHistory.length}{" "}
              {filteredHistory.length === 1 ? "transação" : "transações"}
            </Text>
          </View>
        </View>

        {/* List */}
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={32} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
              nenhuma transação ainda
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredHistory.map((h) => (
              <HistoryCard
                key={h.id}
                contract={h}
                onPress={() => router.push(`/contract-detail/${h.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 0 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 8,
    letterSpacing: 1.5,
  },
  summaryValue: { fontFamily: "DMSans_500Medium", fontSize: 16 },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterChipText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  countBadge: { marginLeft: "auto" },
  countText: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  list: { gap: 8 },
  emptyState: { alignItems: "center", paddingVertical: 64, gap: 12 },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
});
