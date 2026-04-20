import { Feather } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { ContractCard } from "@/components/ContractCard";
import { MenuSheet } from "@/components/MenuSheet";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { StatsBar } from "@/components/StatsBar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useContracts, isContractRunning } from "@/context/ContractsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { formatCurrency } from "@/lib/format";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;

function SkeletonBlock({ width, height, borderRadius = 8, style }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.cardBorder ?? "#edeae6", opacity },
        style,
      ]}
    />
  );
}

function ContractCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[skeletonStyles.card, { backgroundColor: colors.card ?? "#ffffff" }]}>
      <View style={skeletonStyles.cardHeader}>
        <View style={skeletonStyles.avatarRow}>
          <SkeletonBlock width={44} height={44} borderRadius={22} />
          <View style={skeletonStyles.nameCol}>
            <SkeletonBlock width={120} height={13} borderRadius={6} />
            <SkeletonBlock width={80} height={10} borderRadius={5} style={{ marginTop: 6 }} />
          </View>
        </View>
        <SkeletonBlock width={56} height={28} borderRadius={14} />
      </View>
      <View style={skeletonStyles.cardFooter}>
        <SkeletonBlock width={70} height={10} borderRadius={5} />
        <SkeletonBlock width={90} height={22} borderRadius={8} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeContracts, isLoading, acceptContract, beginContract, refreshContracts } = useContracts();
  const [refreshing, setRefreshing] = useState(false);
  const { unreadCount } = useNotifications();
  const { colors } = useTheme();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";

  const isUserReady = !!user?.name;
  const displayName = user?.firstName || user?.name || "você";
  const initials = user?.name ? getInitials(user.name) : "";
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const [now, setNow] = useState(Date.now());

  const hasRunningContracts = activeContracts.some(isContractRunning);

  useEffect(() => {
    if (!hasRunningContracts) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasRunningContracts]);

  const totalPagar = activeContracts
    .filter((c) => c.role === "hiring" && isContractRunning(c))
    .reduce((sum, c) => {
      const hours = (now - c.startedAt) / 1000 / 3600;
      return sum + hours * c.ratePerHour;
    }, 0);

  const totalReceber = activeContracts
    .filter((c) => c.role === "hired" && isContractRunning(c))
    .reduce((sum, c) => {
      const hours = (now - c.startedAt) / 1000 / 3600;
      return sum + hours * c.ratePerHour;
    }, 0);

  const handleAccept = useCallback(
    async (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        await acceptContract(id);
      } catch (e: any) {
        console.warn("[HomeScreen] acceptContract error:", e);
        Alert.alert(
          "Erro ao aceitar contrato",
          e?.message ?? "Não foi possível aceitar o contrato. Tente novamente.",
          [{ text: "OK" }]
        );
      }
    },
    [acceptContract]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshContracts();
    setRefreshing(false);
  }, [refreshContracts]);

  const handleBegin = useCallback(
    async (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await beginContract(id);
      } catch (e: any) {
        console.warn("[HomeScreen] beginContract error:", e);
        Alert.alert(
          "Erro ao iniciar contrato",
          e?.message ?? "Não foi possível iniciar o contrato. Tente novamente.",
          [{ text: "OK" }]
        );
      }
    },
    [beginContract]
  );

  const topPadding = isWeb ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textDim}
            colors={[colors.accent]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          {!isUserReady ? (
            <View style={styles.greetingRow}>
              <SkeletonBlock width={38} height={38} borderRadius={19} />
              <View style={{ gap: 6 }}>
                <SkeletonBlock width={36} height={10} borderRadius={5} />
                <SkeletonBlock width={110} height={18} borderRadius={6} />
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.greetingRow}
              onPress={() => {
                Haptics.selectionAsync();
                setMenuOpen(true);
              }}
              hitSlop={8}
            >
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.greeting}>
                <Text style={[styles.greetingHi, { color: colors.textDim }]}>Olá,</Text>
                <Text style={[styles.greetingName, { color: colors.text }]}>{displayName}!</Text>
              </View>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setNotifOpen(true);
            }}
            style={styles.headerBtn}
            hitSlop={8}
          >
            <Feather name="bell" size={20} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { borderColor: colors.background }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Loading skeletons */}
        {isLoading && (
          <View style={styles.section}>
            <SkeletonBlock width={90} height={9} borderRadius={5} style={{ marginBottom: 14 }} />
            <View style={styles.contractList}>
              <ContractCardSkeleton />
              <ContractCardSkeleton />
            </View>
          </View>
        )}

        {/* Summary bar */}
        {!isLoading && activeContracts.length > 0 && (
          <StatsBar
            style={styles.summaryBar}
            items={[
              { label: "A PAGAR", value: formatCurrency(totalPagar), color: "#e06030", flex: 1.3 },
              { label: "ATIVOS", value: activeContracts.length, align: "center", flex: 0.7 },
              { label: "A RECEBER", value: formatCurrency(totalReceber), color: "#18a06b", align: "flex-end", flex: 1.3 },
            ]}
          />
        )}

        {/* Active contracts */}
        {!isLoading && activeContracts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>EM ANDAMENTO</Text>
            <View style={styles.contractList}>
              {activeContracts.map((c) => (
                <ContractCard
                  key={c.id}
                  contract={c}
                  onAccept={handleAccept}
                  onBegin={handleBegin}
                  onPress={() => router.push(`/contract-detail/${c.id}` as any)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {!isLoading && activeContracts.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="clock" size={36} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>nenhum contrato ativo</Text>
            <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
              Toque no botão central para iniciar uma contratação
            </Text>
          </View>
        )}

        <View style={{ height: isWeb ? 34 + 84 + 20 : 100 }} />
      </ScrollView>

      <NotificationsSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        buttons={dialog?.buttons}
        onDismiss={() => setDialog(null)}
      />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nameCol: {
    gap: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
});

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
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: {
    gap: 0,
  },
  greetingHi: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  greetingName: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Sora_700Bold",
    fontSize: 13,
    color: "#fff",
    letterSpacing: 0.5,
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
    backgroundColor: "#e06030",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 8,
    color: "#fff",
    fontWeight: "700",
  },
  summaryBar: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  contractList: {
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  emptySubtext: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 18,
  },
});
