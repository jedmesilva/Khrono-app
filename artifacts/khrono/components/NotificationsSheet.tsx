import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import {
  useNotifications,
  type AppNotification,
} from "@/context/NotificationsContext";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type NotifMeta = {
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

function getNotifMeta(type: string): NotifMeta {
  switch (type) {
    case "contract_created":
      return { icon: "user-check", color: "#e06030" };
    case "contract_accepted":
      return { icon: "check-circle", color: "#18a06b" };
    case "contract_started":
      return { icon: "play-circle", color: "#e06030" };
    case "contract_ended":
      return { icon: "flag", color: "#18a06b" };
    case "payment":
      return { icon: "dollar-sign", color: "#18a06b" };
    case "rating":
      return { icon: "star", color: "#f5c518" };
    default:
      return { icon: "bell", color: "#8888aa" };
  }
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `${days} dias atrás`;
}

export function NotificationsSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();
  const ref = useRef<BottomSheetModal>(null);

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

  const handleTap = (n: AppNotification) => {
    if (!n.read_at) markAsRead(n.id);
  };

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
          <Text style={[staticStyles.title, { color: colors.text }]}>
            Notificações
          </Text>
          {unreadCount > 0 && (
            <Text style={staticStyles.unreadLabel}>
              {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
            </Text>
          )}
        </View>
        <View style={staticStyles.headerActions}>
          {unreadCount > 0 && (
            <Pressable
              onPress={markAllAsRead}
              hitSlop={12}
              style={staticStyles.markAllBtn}
            >
              <Text style={staticStyles.markAllText}>Marcar todas lidas</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          staticStyles.list,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {loading && notifications.length === 0 && (
          <View style={staticStyles.emptyWrap}>
            <ActivityIndicator color="#e06030" />
          </View>
        )}

        {!loading && notifications.length === 0 && (
          <View style={staticStyles.emptyWrap}>
            <Feather name="bell-off" size={32} color={colors.textDim} />
            <Text style={[staticStyles.emptyText, { color: colors.textDim }]}>
              Nenhuma notificação ainda
            </Text>
          </View>
        )}

        {notifications.map((n, i) => {
          const { icon, color } = getNotifMeta(n.type);
          const isRead = !!n.read_at;
          return (
            <View key={n.id}>
              <Pressable
                onPress={() => handleTap(n)}
                style={[staticStyles.item, isRead && staticStyles.itemRead]}
              >
                <View
                  style={[
                    staticStyles.iconWrap,
                    { backgroundColor: color + "18" },
                  ]}
                >
                  <Feather name={icon} size={16} color={color} />
                </View>
                <View style={staticStyles.itemContent}>
                  <View style={staticStyles.itemTop}>
                    <Text
                      style={[
                        staticStyles.itemTitle,
                        { color: colors.text },
                        isRead && { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {n.title}
                    </Text>
                    <Text
                      style={[
                        staticStyles.itemTime,
                        { color: colors.textDim },
                      ]}
                    >
                      {formatRelativeTime(n.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      staticStyles.itemBody,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {n.body}
                  </Text>
                </View>
                {!isRead && <View style={staticStyles.dot} />}
              </Pressable>
              {i < notifications.length - 1 && (
                <View
                  style={[
                    staticStyles.divider,
                    { backgroundColor: colors.divider },
                  ]}
                />
              )}
            </View>
          );
        })}
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
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#e06030",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#e06030",
    letterSpacing: 0.2,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    letterSpacing: 0.2,
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
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  itemBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 17,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#e06030",
    marginTop: 6,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    marginHorizontal: 4,
  },
});
