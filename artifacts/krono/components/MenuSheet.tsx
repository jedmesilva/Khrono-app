import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "@/lib/haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog } from "@/components/AppDialog";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

type MenuItem = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

function getInitials(name: string, contact: string): string {
  const source = name.trim() || contact.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function MenuSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { logout, user, isLoading } = useAuth();
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);
  const [logoutDialog, setLogoutDialog] = useState(false);
  const userName = user?.name?.trim() || user?.firstName?.trim() || "Minha conta";
  const userContact = user?.contact?.trim() || (isLoading ? "Carregando conta..." : "Dados da conta");
  const initials = getInitials(userName, userContact);

  const snapPoints = useMemo(() => ["58%"], []);

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

  const menuItems: MenuItem[] = [
    {
      id: "history",
      icon: "clock",
      label: "Histórico",
      sublabel: "Contratos encerrados",
      onPress: () => {
        Haptics.selectionAsync();
        onClose();
        setTimeout(() => router.push("/history"), 300);
      },
    },
    {
      id: "definicoes",
      icon: "settings",
      label: "Definições",
      sublabel: "Notificações, segurança e mais",
      onPress: () => {
        Haptics.selectionAsync();
        onClose();
        setTimeout(() => router.push("/definicoes"), 300);
      },
    },
    {
      id: "support",
      icon: "message-circle",
      label: "Suporte",
      sublabel: "Tire suas dúvidas",
      onPress: () => { Haptics.selectionAsync(); onClose(); },
    },
    {
      id: "logout",
      icon: "log-out",
      label: "Sair da conta",
      danger: true,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLogoutDialog(true);
      },
    },
  ];

  return (
    <>
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBgStyle}
        handleIndicatorStyle={handleStyle}
        onDismiss={onClose}
      >
        <BottomSheetScrollView
          contentContainerStyle={[staticStyles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* User info row */}
          <Pressable
            style={({ pressed }) => [staticStyles.userRow, pressed && { opacity: 0.7 }]}
            onPress={() => {
              Haptics.selectionAsync();
              onClose();
              setTimeout(() => router.push("/conta"), 300);
            }}
          >
            <View style={[staticStyles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={staticStyles.avatarText}>{initials}</Text>
            </View>
            <View style={staticStyles.userInfo}>
              <Text style={[staticStyles.userName, { color: colors.text }]} numberOfLines={1}>{userName}</Text>
              <Text style={[staticStyles.userSub, { color: colors.textDim }]} numberOfLines={1}>{userContact}</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.chevron} />
          </Pressable>

          <View style={[staticStyles.divider, { backgroundColor: colors.divider }]} />

          {/* Menu items */}
          <View style={staticStyles.itemsContainer}>
            {menuItems.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  staticStyles.menuItem,
                  pressed && { backgroundColor: colors.rowPressed },
                ]}
                onPress={item.onPress}
              >
                <View
                  style={[
                    staticStyles.menuIconWrap,
                    { backgroundColor: colors.menuIconBg },
                    item.danger && { backgroundColor: "#ff3b3015" },
                  ]}
                >
                  <Feather
                    name={item.icon}
                    size={16}
                    color={item.danger ? "#ff3b30" : colors.textSecondary}
                  />
                </View>
                <View style={staticStyles.menuTextWrap}>
                  <Text style={[staticStyles.menuLabel, { color: colors.text }, item.danger && { color: "#ff3b30" }]}>
                    {item.label}
                  </Text>
                  {item.sublabel && (
                    <Text style={[staticStyles.menuSublabel, { color: colors.textDim }]}>
                      {item.sublabel}
                    </Text>
                  )}
                </View>
                {!item.danger && (
                  <Feather name="chevron-right" size={14} color={colors.chevron} />
                )}
              </Pressable>
            ))}
          </View>

        </BottomSheetScrollView>
      </BottomSheetModal>

      <AppDialog
        visible={logoutDialog}
        title="Sair da conta?"
        message="Você precisará fazer login novamente."
        buttons={[
          { text: "Cancelar", style: "cancel", onPress: () => setLogoutDialog(false) },
          {
            text: "Sair",
            style: "destructive",
            onPress: async () => {
              setLogoutDialog(false);
              onClose();
              await logout();
            },
          },
        ]}
        onDismiss={() => setLogoutDialog(false)}
      />
    </>
  );
}

const staticStyles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
  },
  userSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  itemsContainer: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
  },
  menuSublabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginTop: 2,
  },
});
