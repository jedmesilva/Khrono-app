import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContractCard } from "@/components/ContractCard";
import { HistoryCard } from "@/components/HistoryCard";
import { MenuSheet } from "@/components/MenuSheet";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import Colors from "@/constants/colors";
import { useContracts } from "@/context/ContractsContext";

const UNREAD_COUNT = 2;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeContracts, history, endContract } = useContracts();
  const isWeb = Platform.OS === "web";
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const now = Date.now();

  const totalPagar = activeContracts
    .filter((c) => c.role === "hiring")
    .reduce((sum, c) => {
      const hours = (now - c.startedAt) / 1000 / 3600;
      return sum + hours * c.ratePerHour;
    }, 0);

  const totalReceber = activeContracts
    .filter((c) => c.role === "hired")
    .reduce((sum, c) => {
      const hours = (now - c.startedAt) / 1000 / 3600;
      return sum + hours * c.ratePerHour;
    }, 0);

  const handleStop = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert("Encerrar contrato?", "O valor será calculado e registrado no histórico.", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Encerrar",
          style: "destructive",
          onPress: () => endContract(id),
        },
      ]);
    },
    [endContract]
  );

  const topPadding = isWeb ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            K<Text style={{ color: Colors.accent }}>r</Text>ono
          </Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setNotifOpen(true);
                setMenuOpen(false);
              }}
              style={styles.headerBtn}
              hitSlop={8}
            >
              <Feather name="bell" size={20} color="#555" />
              {UNREAD_COUNT > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{UNREAD_COUNT}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setMenuOpen(true);
                setNotifOpen(false);
              }}
              style={styles.headerBtn}
              hitSlop={8}
            >
              <Feather name="menu" size={20} color="#555" />
            </Pressable>
          </View>
        </View>

        {/* Summary bar */}
        {activeContracts.length > 0 && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>ATIVOS</Text>
              <Text style={styles.summaryValue}>{activeContracts.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={[styles.summaryItem, { alignItems: "center" }]}>
              <Text style={styles.summaryLabel}>A PAGAR</Text>
              <Text style={[styles.summaryValue, { color: Colors.accent }]}>
                R${totalPagar.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={[styles.summaryItem, { alignItems: "flex-end" }]}>
              <Text style={styles.summaryLabel}>A RECEBER</Text>
              <Text style={[styles.summaryValue, { color: Colors.accentGreen }]}>
                R${totalReceber.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Active contracts */}
        {activeContracts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EM ANDAMENTO</Text>
            <View style={styles.contractList}>
              {activeContracts.map((c) => (
                <ContractCard key={c.id} contract={c} onStop={handleStop} />
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {activeContracts.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="clock" size={36} color={Colors.textDim} />
            <Text style={styles.emptyText}>nenhum contrato ativo</Text>
            <Text style={styles.emptySubtext}>
              Toque no botão central para iniciar uma contratação
            </Text>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>ENCERRADOS</Text>
              <Pressable onPress={() => router.push("/history")}>
                <Text style={styles.sectionLink}>Ver tudo</Text>
              </Pressable>
            </View>
            <View style={styles.historyList}>
              {history.slice(0, 3).map((h) => (
                <HistoryCard key={h.id} contract={h} />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: isWeb ? 34 + 84 + 20 : 100 }} />
      </ScrollView>

      <NotificationsSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerBtn: {
    padding: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 8,
    color: "#fff",
    fontWeight: "700",
  },
  pinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pinLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#555",
    letterSpacing: 1,
  },
  pinCode: {
    fontFamily: "DMMono_500Medium",
    fontSize: 14,
    color: "#ff6b35",
    letterSpacing: 2,
  },
  summaryBar: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#555",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 17,
    color: "#fff",
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#1a1a1a",
    marginHorizontal: 10,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionLink: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  contractList: {
    gap: 12,
  },
  historyList: {
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 14,
    color: "#333",
  },
  emptySubtext: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#222",
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 18,
  },
});
