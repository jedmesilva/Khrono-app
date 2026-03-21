import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HistoryCard } from "@/components/HistoryCard";
import Colors from "@/constants/colors";
import { useContracts } from "@/context/ContractsContext";

type Filter = "all" | "hiring" | "hired";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { history } = useContracts();
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
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Histórico</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stats */}
      {history.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PAGO</Text>
            <Text style={[styles.statValue, { color: Colors.accent }]}>
              R${totalPaid.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={[styles.statItem, { alignItems: "center" }]}>
            <Text style={styles.statLabel}>CONTRATOS</Text>
            <Text style={styles.statValue}>{history.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={[styles.statItem, { alignItems: "flex-end" }]}>
            <Text style={styles.statLabel}>RECEBIDO</Text>
            <Text style={[styles.statValue, { color: Colors.accentGreen }]}>
              R${totalReceived.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        {(["all", "hiring", "hired"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === "all" ? "Todos" : f === "hiring" ? "Contratei" : "Fui contratado"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={32} color="#222" />
          <Text style={styles.emptyText}>nenhum registro aqui</Text>
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 16,
    color: "#fff",
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#1a1a1a",
    marginHorizontal: 12,
  },
  statLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 8,
    color: "#444",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 16,
    color: "#fff",
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
    borderColor: "#1a1a1a",
    backgroundColor: "#0a0a0a",
  },
  filterBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + "15",
  },
  filterText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    letterSpacing: 0.3,
  },
  filterTextActive: {
    color: Colors.accent,
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
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#333",
  },
});
