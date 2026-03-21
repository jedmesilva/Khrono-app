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

import { AddCardModal } from "@/components/AddCardModal";
import { AppDialog } from "@/components/AppDialog";
import { HistoryCard } from "@/components/HistoryCard";
import { PixDepositModal } from "@/components/PixDepositModal";
import { PixWithdrawModal } from "@/components/PixWithdrawModal";
import Colors from "@/constants/colors";
import { useCards } from "@/context/CardsContext";
import { useContracts } from "@/context/ContractsContext";

type CardBandeira = "Visa" | "Mastercard";

function BandeiraTag({ bandeira }: { bandeira: CardBandeira }) {
  const isVisa = bandeira === "Visa";
  const color = isVisa ? "#1a1f71" : "#eb001b";
  const bg = isVisa ? "#1a1f7115" : "#eb001b15";
  const border = isVisa ? "#1a1f7130" : "#eb001b30";
  return (
    <View
      style={[
        styles.bandeiraTag,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      <Text style={[styles.bandeiraText, { color }]}>
        {bandeira.toUpperCase()}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { history } = useContracts();
  const { cards, removeCard, setDefault } = useCards();

  const [showBalance, setShowBalance] = useState(true);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [addCardModalVisible, setAddCardModalVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "recebido" | "pago">("todos");

  const totalReceived = history
    .filter((h) => h.role === "hired")
    .reduce((sum, h) => sum + (h.totalAmount || 0), 0);

  const totalPaid = history
    .filter((h) => h.role === "hiring")
    .reduce((sum, h) => sum + (h.totalAmount || 0), 0);

  const filteredHistory = history.filter((h) => {
    if (filtro === "recebido") return h.role === "hired";
    if (filtro === "pago") return h.role === "hiring";
    return true;
  });

  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const formatBalance = (val: number) =>
    showBalance ? `R$ ${val.toFixed(2).replace(".", ",")}` : "R$ ••••••";

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

          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>{formatBalance(totalReceived)}</Text>
            <Pressable
              onPress={() => setShowBalance((v) => !v)}
              style={styles.eyeBtn}
              hitSlop={12}
            >
              <Feather
                name={showBalance ? "eye-off" : "eye"}
                size={16}
                color="#555"
              />
            </Pressable>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { borderColor: Colors.accent + "25", backgroundColor: Colors.accent + "10" }]}>
              <Text style={[styles.statChipLabel, { color: Colors.accent }]}>PAGO</Text>
              <Text style={[styles.statChipValue, { color: Colors.accent }]}>
                {showBalance ? `R$ ${totalPaid.toFixed(2)}` : "••••"}
              </Text>
            </View>
            <View style={[styles.statChip, { borderColor: Colors.accentGreen + "25", backgroundColor: Colors.accentGreen + "10" }]}>
              <Text style={[styles.statChipLabel, { color: Colors.accentGreen }]}>RECEBIDO</Text>
              <Text style={[styles.statChipValue, { color: Colors.accentGreen }]}>
                {showBalance ? `R$ ${totalReceived.toFixed(2)}` : "••••"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: Colors.accentGreen + "25" },
              pressed && { backgroundColor: Colors.accentGreen + "12" },
            ]}
            onPress={() => setDepositModalVisible(true)}
          >
            <Feather name="arrow-down-left" size={18} color={Colors.accentGreen} />
            <Text style={[styles.actionBtnText, { color: Colors.accentGreen }]}>
              Depositar
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: Colors.accent + "25" },
              pressed && { backgroundColor: Colors.accent + "12" },
            ]}
            onPress={() => setWithdrawModalVisible(true)}
          >
            <Feather name="arrow-up-right" size={18} color={Colors.accent} />
            <Text style={[styles.actionBtnText, { color: Colors.accent }]}>
              Sacar
            </Text>
          </Pressable>
        </View>

        {/* Cards section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pagamento</Text>
          <Pressable
            style={styles.addCardBtn}
            onPress={() => setAddCardModalVisible(true)}
          >
            <Feather name="plus" size={11} color="#555" />
            <Text style={styles.addCardText}>adicionar</Text>
          </Pressable>
        </View>

        <View style={styles.cardsList}>
          {cards.map((card) => (
            <View
              key={card.id}
              style={[
                styles.cardItem,
                card.padrao && {
                  borderColor: Colors.accent + "35",
                  backgroundColor: Colors.accent + "05",
                },
              ]}
            >
              <BandeiraTag bandeira={card.bandeira} />

              <View style={styles.cardInfo}>
                <View style={styles.cardInfoTop}>
                  <Text style={styles.cardName}>
                    {card.bandeira} •••• {card.numero}
                  </Text>
                  {card.padrao && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>padrão</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardValidade}>
                  Válido até {card.validade}
                </Text>
              </View>

              <View style={styles.cardActions}>
                {!card.padrao && (
                  <Pressable
                    style={styles.setDefaultBtn}
                    onPress={() => setDefault(card.id)}
                  >
                    <Text style={styles.setDefaultText}>padrão</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setCardToDelete(card.id)}
                  hitSlop={10}
                  style={styles.removeBtn}
                >
                  <Feather name="trash-2" size={14} color="#2a2a2a" />
                </Pressable>
              </View>
            </View>
          ))}

          {cards.length === 0 && (
            <View style={styles.emptyCards}>
              <Feather name="credit-card" size={20} color="#2a2a2a" />
              <Text style={styles.emptyCardsText}>nenhum cartão salvo</Text>
            </View>
          )}
        </View>

        {/* Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Movimentações</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          {(
            [
              { key: "todos", label: "Todos" },
              { key: "recebido", label: "Recebidos" },
              { key: "pago", label: "Pagos" },
            ] as const
          ).map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                filtro === f.key && styles.filterChipActive,
              ]}
              onPress={() => setFiltro(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filtro === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={32} color="#333" />
            <Text style={styles.emptyText}>nenhuma transação ainda</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredHistory.map((h) => (
              <HistoryCard key={h.id} contract={h} />
            ))}
          </View>
        )}
      </ScrollView>

      <PixDepositModal
        visible={depositModalVisible}
        onClose={() => setDepositModalVisible(false)}
      />
      <PixWithdrawModal
        visible={withdrawModalVisible}
        balance={totalReceived}
        onClose={() => setWithdrawModalVisible(false)}
      />
      <AddCardModal
        visible={addCardModalVisible}
        onClose={() => setAddCardModalVisible(false)}
      />
      <AppDialog
        visible={cardToDelete !== null}
        title="Remover cartão"
        message="Tem certeza que deseja remover este cartão da sua carteira?"
        onDismiss={() => setCardToDelete(null)}
        buttons={[
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: () => {
              if (cardToDelete) removeCard(cardToDelete);
            },
          },
        ]}
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
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 24,
    padding: 24,
    marginBottom: 14,
    gap: 12,
  },
  balanceLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#555",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  balanceAmount: {
    fontFamily: "DMMono_500Medium",
    fontSize: 32,
    color: "#fff",
    letterSpacing: -0.5,
    flex: 1,
  },
  eyeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  statChipLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 8,
    letterSpacing: 1.5,
  },
  statChipValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 15,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
  },
  actionBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addCardText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
  },

  cardsList: {
    gap: 8,
    marginBottom: 28,
  },
  cardItem: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bandeiraTag: {
    width: 38,
    height: 26,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bandeiraText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 8,
    letterSpacing: 0.5,
    fontWeight: "800",
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardInfoTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  defaultBadge: {
    backgroundColor: Colors.accent + "15",
    borderWidth: 1,
    borderColor: Colors.accent + "25",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: Colors.accent,
  },
  cardValidade: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  setDefaultBtn: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  setDefaultText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
  },
  removeBtn: {
    padding: 4,
  },
  emptyCards: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyCardsText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#333",
  },

  filtersRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: "#fff",
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
