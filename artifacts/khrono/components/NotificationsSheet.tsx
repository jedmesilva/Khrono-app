import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

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
    iconColor: "#00e5a0",
    title: "Contrato encerrado",
    body: "Seu contrato com Rafael Lima foi encerrado. Total: R$120,00",
    time: "2h atrás",
    read: false,
  },
  {
    id: "2",
    icon: "user-check",
    iconColor: "#ff6b35",
    title: "Nova contratação",
    body: "Bruno Souza te contratou para Consultoria de Redes Sociais.",
    time: "5h atrás",
    read: false,
  },
  {
    id: "3",
    icon: "dollar-sign",
    iconColor: "#00e5a0",
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
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  const snapPoints = useMemo(() => ["75%"], []);

  const sheetBgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: colors.sheetBorder,
    }),
    [colors]
  );

  const handleStyle = useMemo(
    () => ({ backgroundColor: colors.handleColor, width: 36, height: 4 }),
    [colors]
  );

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

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

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBgStyle}
      handleIndicatorStyle={handleStyle}
      onDismiss={onClose}
    >
      {/* Header */}
      <View style={staticStyles.header}>
        <View>
          <Text style={[staticStyles.title, { color: colors.text }]}>Notificações</Text>
          {unreadCount > 0 && (
            <Text style={staticStyles.unreadLabel}>{unreadCount} não lidas</Text>
          )}
        </View>
        <Pressable onPress={onClose} hitSlop={12}>
          <Feather name="x" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[staticStyles.list, { paddingBottom: Math.max(insets.bottom, 24) }]}
      >
        {MOCK_NOTIFICATIONS.map((n, i) => (
          <View key={n.id}>
            <View style={[staticStyles.item, n.read && staticStyles.itemRead]}>
              <View style={[staticStyles.iconWrap, { backgroundColor: n.iconColor + "18" }]}>
                <Feather name={n.icon} size={16} color={n.iconColor} />
              </View>
              <View style={staticStyles.itemContent}>
                <View style={staticStyles.itemTop}>
                  <Text style={[staticStyles.itemTitle, { color: colors.text }, n.read && { color: colors.textSecondary }]}>
                    {n.title}
                  </Text>
                  <Text style={[staticStyles.itemTime, { color: colors.textDim }]}>{n.time}</Text>
                </View>
                <Text style={[staticStyles.itemBody, { color: colors.textSecondary }]}>{n.body}</Text>
              </View>
              {!n.read && <View style={staticStyles.dot} />}
            </View>
            {i < MOCK_NOTIFICATIONS.length - 1 && (
              <View style={[staticStyles.divider, { backgroundColor: colors.divider }]} />
            )}
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const staticStyles = StyleSheet.create({
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
  },
  unreadLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#ff6b35",
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
    flex: 1,
  },
  itemTime: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  itemBody: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    lineHeight: 17,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ff6b35",
    marginTop: 6,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    marginHorizontal: 4,
  },
});
