import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HistoryCard } from "@/components/HistoryCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatsBar } from "@/components/StatsBar";
import { useTheme } from "@/context/ThemeContext";
import { useContracts } from "@/context/ContractsContext";
import { formatCurrency } from "@/lib/format";

const GREEN = "#18a06b";

type Filter = "all" | "hiring" | "hired";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { history, isLoading } = useContracts();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const isWeb = Platform.OS === "web";

  const filtered = history.filter((c) => {
    if (filter === "all") return true;
    return c.role === filter;
  });

  const totalPaid = history
    .filter((c) => c.role === "hiring")
    .reduce((sum, c) => sum + (c.totalAmount ?? 0), 0);

  const totalReceived = history
    .filter((c) => c.role === "hired")
    .reduce((sum, c) => sum + (c.totalAmount ?? 0), 0);

  const topPadding = isWeb ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding, backgroundColor: colors.background }]}>
      <ScreenHeader title="Histórico" />

      {/* Stats */}
      {history.length > 0 && (
        <StatsBar
          style={styles.statsRow}
          items={[
            { label: "PAGO", value: formatCurrency(totalPaid), color: colors.accent },
            { label: "CONTRATOS", value: history.length, align: "center" },
            { label: "RECEBIDO", value: formatCurrency(totalReceived), color: GREEN, align: "flex-end" },
          ]}
        />
      )}

      {/* Filters */}
      <View style={styles.filters}>
        {(["all", "hiring", "hired"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterBtn,
              { borderColor: colors.cardBorder, backgroundColor: colors.card },
              filter === f && { borderColor: colors.accent, backgroundColor: colors.accent + "15" },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.textMuted },
                filter === f && { color: colors.accent },
              ]}
            >
              {f === "all" ? "Todos" : f === "hiring" ? "Contratei" : "Fui contratado"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.emptyText, { color: colors.textDim }]}>carregando histórico...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={32} color={colors.textDim} />
          <Text style={[styles.emptyText, { color: colors.textDim }]}>nenhum registro aqui</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryCard
              contract={item}
              onPress={() => router.push(`/contract-detail/${item.id}` as any)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: isWeb ? 34 + 84 + 20 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
  },
});
