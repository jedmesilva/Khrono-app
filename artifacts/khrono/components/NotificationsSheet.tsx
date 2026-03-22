import { Feather } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

type Notification = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    icon: "check-circle",
    iconColor: Colors.accentGreen,
    title: "Contrato encerrado",
    body: "Seu contrato com Rafael Lima foi encerrado. Total: R$120,00",
    time: "2h atrás",
    read: false,
  },
  {
    id: "2",
    icon: "user-check",
    iconColor: Colors.accent,
    title: "Nova contratação",
    body: "Bruno Souza te contratou para Consultoria de Redes Sociais.",
    time: "5h atrás",
    read: false,
  },
  {
    id: "3",
    icon: "dollar-sign",
    iconColor: Colors.accentGreen,
    title: "Pagamento recebido",
    body: "R$75,00 creditados pelo contrato com Ana Pereira.",
    time: "ontem",
    read: true,
  },
  {
    id: "4",
    icon: "star",
    iconColor: "#f5c518",
    title: "Avaliação recebida",
    body: "Mariana Costa te avaliou com 5 estrelas. Ótimo trabalho!",
    time: "2 dias atrás",
    read: true,
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function NotificationsSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  const snapPoints = useMemo(() => ["75%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
        pressBehavior="close"
      />
    ),
    []
  );

  if (!visible) return null;

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      onClose={onClose}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notificações</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadLabel}>{unreadCount} não lidas</Text>
          )}
        </View>
        <Pressable onPress={onClose} hitSlop={12}>
          <Feather name="x" size={18} color="#555" />
        </Pressable>
      </View>

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 24) }]}
      >
        {MOCK_NOTIFICATIONS.map((n, i) => (
          <View key={n.id}>
            <View style={[styles.item, n.read && styles.itemRead]}>
              <View style={[styles.iconWrap, { backgroundColor: n.iconColor + "18" }]}>
                <Feather name={n.icon} size={16} color={n.iconColor} />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTop}>
                  <Text style={[styles.itemTitle, n.read && styles.itemTitleRead]}>
                    {n.title}
                  </Text>
                  <Text style={styles.itemTime}>{n.time}</Text>
                </View>
                <Text style={styles.itemBody}>{n.body}</Text>
              </View>
              {!n.read && <View style={styles.dot} />}
            </View>
            {i < MOCK_NOTIFICATIONS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#0d0d0d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
  },
  handle: {
    backgroundColor: "#2a2a2a",
    width: 36,
    height: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 4,
    marginBottom: 20,
  },
  title: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 18,
    color: "#fff",
  },
  unreadLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: Colors.accent,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  itemRead: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
    flex: 1,
  },
  itemTitleRead: {
    color: "#666",
  },
  itemTime: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#333",
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  itemBody: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 17,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginTop: 6,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#141414",
    marginHorizontal: 4,
  },
});
