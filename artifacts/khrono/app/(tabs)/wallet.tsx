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

import { AddCardModal } from "@/components/AddCardModal";
import { AppDialog } from "@/components/AppDialog";
import { HistoryCard } from "@/components/HistoryCard";
import { PixDepositModal } from "@/components/PixDepositModal";
import { PixWithdrawModal } from "@/components/PixWithdrawModal";
import { useTheme } from "@/context/ThemeContext";
import { useWallet } from "@/context/WalletContext";
import { useContracts } from "@/context/ContractsContext";
import { formatCurrency } from "@/lib/format";

const RECENT_LIMIT = 5;

type CardBandeira = "Visa" | "Mastercard";

function BandeiraTag({ bandeira }: { bandeira: CardBandeira }) {
  const isVisa = bandeira === "Visa";
  const color = isVisa ? "#1a1f71" : "#eb001b";
  const bg = isVisa ? "#1a1f7115" : "#eb001b15";
  const border = isVisa ? "#1a1f7130" : "#eb001b30";
  return (
    <View style={[styles.bandeiraTag, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.bandeiraText, { color }]}>{bandeira.toUpperCase()}</Text>
    </View>
  );
}

export default function WalletScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { history } = useContracts();
  const { balance, cards, transactions, removeCard, setDefaultCard, recordDeposit, recordWithdrawal } = useWallet();

  const [showBalance, setShowBalance] = useState(true);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [addCardModalVisible, setAddCardModalVisible] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const totalReceived = history.filter((h) => h.role === "hired").reduce((sum, h) => sum + (h.totalAmount || 0), 0);
  const totalPaid = history.filter((h) => h.role === "hiring").reduce((sum, h) => sum + (h.totalAmount || 0), 0);
  const recentHistory = history.slice(0, RECENT_LIMIT);
  const hasMore = history.length > RECENT_LIMIT;

  const topPadding = isWeb ? insets.top + 67 : insets.top;
  const fmt = (val: number) =>
    showBalance ? formatCurrency(val) : "R$ ••••••";
  const formatBalance = fmt;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 20, paddingBottom: isWeb ? 34 + 84 + 20 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Carteira</Text>
        </View>

        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.balanceLabel, { color: colors.textDim }]}>SALDO DISPONÍVEL</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>{formatBalance(balance)}</Text>
            <Pressable onPress={() => setShowBalance((v) => !v)} style={[styles.eyeBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]} hitSlop={12}>
              <Feather name={showBalance ? "eye-off" : "eye"} size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: "#e0603010" }]}>
              <Text style={[styles.statChipLabel, { color: "#e06030" }]}>PAGO</Text>
              <Text style={[styles.statChipValue, { color: "#e06030" }]}>
                {showBalance ? formatCurrency(totalPaid) : "••••"}
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: "#18a06b10" }]}>
              <Text style={[styles.statChipLabel, { color: "#18a06b" }]}>RECEBIDO</Text>
              <Text style={[styles.statChipValue, { color: "#18a06b" }]}>
                {showBalance ? formatCurrency(totalReceived) : "••••"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { borderColor: "#18a06b25", backgroundColor: colors.card }, pressed && { backgroundColor: "#18a06b12" }]}
            onPress={() => setDepositModalVisible(true)}
          >
            <Feather name="arrow-down-left" size={18} color="#18a06b" />
            <Text style={[styles.actionBtnText, { color: "#18a06b" }]}>Depositar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { borderColor: "#e0603025", backgroundColor: colors.card }, pressed && { backgroundColor: "#e0603012" }]}
            onPress={() => setWithdrawModalVisible(true)}
          >
            <Feather name="arrow-up-right" size={18} color="#e06030" />
            <Text style={[styles.actionBtnText, { color: "#e06030" }]}>Sacar</Text>
          </Pressable>
        </View>

        {/* Cards section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pagamento</Text>
          <Pressable
            style={[styles.addCardBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            onPress={() => setAddCardModalVisible(true)}
          >
            <Feather name="plus" size={11} color={colors.textSecondary} />
            <Text style={[styles.addCardText, { color: colors.textSecondary }]}>adicionar</Text>
          </Pressable>
        </View>

        <View style={styles.cardsList}>
          {cards.map((card) => (
            <View
              key={card.id}
              style={[
                styles.cardItem,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                card.isDefault && { borderColor: "#e0603035", backgroundColor: "#e0603005" },
              ]}
            >
              <BandeiraTag bandeira={card.bandeira} />
              <View style={styles.cardInfo}>
                <View style={styles.cardInfoTop}>
                  <Text style={[styles.cardName, { color: colors.text }]}>{card.bandeira} •••• {card.lastFour}</Text>
                  {card.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>padrão</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardValidade, { color: colors.textMuted }]}>Válido até {card.validade}</Text>
              </View>
              <View style={styles.cardActions}>
                {!card.isDefault && (
                  <Pressable
                    style={[styles.setDefaultBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                    onPress={() => setDefaultCard(card.id)}
                  >
                    <Text style={[styles.setDefaultText, { color: colors.textMuted }]}>padrão</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setCardToDelete(card.id)} hitSlop={10} style={styles.removeBtn}>
                  <Feather name="trash-2" size={14} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          ))}

          {cards.length === 0 && (
            <View style={[styles.emptyCards, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Feather name="credit-card" size={20} color={colors.textDim} />
              <Text style={[styles.emptyCardsText, { color: colors.textDim }]}>nenhum cartão salvo</Text>
            </View>
          )}
        </View>

        {/* Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Movimentações recentes</Text>
          <Pressable
            style={styles.verTodasBtn}
            onPress={() => router.push("/wallet/transactions")}
          >
            <Text style={[styles.verTodasText, { color: colors.accent }]}>Ver todas</Text>
            <Feather name="chevron-right" size={13} color={colors.accent} />
          </Pressable>
        </View>

        {recentHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={32} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>nenhuma transação ainda</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {recentHistory.map((h) => (
              <HistoryCard
                key={h.id}
                contract={h}
                onPress={() => router.push(`/contract-detail/${h.id}`)}
              />
            ))}
            {hasMore && (
              <Pressable
                style={({ pressed }) => [
                  styles.seeAllRow,
                  { borderColor: colors.cardBorder, backgroundColor: pressed ? colors.surface : colors.card },
                ]}
                onPress={() => router.push("/wallet/transactions")}
              >
                <Text style={[styles.seeAllText, { color: colors.accent }]}>
                  Ver todas as {history.length} movimentações
                </Text>
                <Feather name="arrow-right" size={14} color={colors.accent} />
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <PixDepositModal visible={depositModalVisible} onClose={() => setDepositModalVisible(false)} />
      <PixWithdrawModal visible={withdrawModalVisible} balance={balance} onClose={() => setWithdrawModalVisible(false)} />
      <AddCardModal visible={addCardModalVisible} onClose={() => setAddCardModalVisible(false)} />
      <AppDialog
        visible={cardToDelete !== null}
        title="Remover cartão"
        message="Tem certeza que deseja remover este cartão da sua carteira?"
        onDismiss={() => setCardToDelete(null)}
        buttons={[
          { text: "Cancelar", style: "cancel" },
          { text: "Remover", style: "destructive", onPress: () => { if (cardToDelete) { removeCard(cardToDelete); setCardToDelete(null); } } },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  balanceCard: { borderRadius: 24, padding: 24, marginBottom: 14, gap: 12 },
  balanceLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  balanceAmount: { fontFamily: "DMSans_500Medium", fontSize: 32, letterSpacing: -0.5, flex: 1 },
  eyeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  statChip: { flex: 1, borderRadius: 12, padding: 12, gap: 4 },
  statChipLabel: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 1.5 },
  statChipValue: { fontFamily: "DMSans_500Medium", fontSize: 15 },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderWidth: 1, borderRadius: 24, paddingVertical: 16,
  },
  actionBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontFamily: "Sora_700Bold", fontSize: 14 },
  addCardBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addCardText: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  cardsList: { gap: 8, marginBottom: 28 },
  cardItem: { borderWidth: 1, borderRadius: 24, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  bandeiraTag: { width: 38, height: 26, borderRadius: 5, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bandeiraText: { fontFamily: "DMSans_500Medium", fontSize: 8, letterSpacing: 0.5, fontWeight: "800" },
  cardInfo: { flex: 1, gap: 3 },
  cardInfoTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  defaultBadge: { backgroundColor: "#e0603015", borderWidth: 1, borderColor: "#e0603025", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 },
  defaultBadgeText: { fontFamily: "DMSans_400Regular", fontSize: 9, color: "#e06030" },
  cardValidade: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  setDefaultBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  setDefaultText: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  removeBtn: { padding: 4 },
  emptyCards: { borderWidth: 1, borderStyle: "dashed", borderRadius: 24, padding: 24, alignItems: "center", gap: 10 },
  emptyCardsText: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  verTodasBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  verTodasText: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  seeAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  seeAllText: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  list: { gap: 8 },
});
