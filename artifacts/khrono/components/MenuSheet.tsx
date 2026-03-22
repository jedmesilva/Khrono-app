import { Feather } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { router } from "expo-router";

import { AppDialog } from "@/components/AppDialog";
import Colors from "@/constants/colors";

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

export function MenuSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [logoutDialog, setLogoutDialog] = useState(false);

  const snapPoints = useMemo(() => ["60%"], []);

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
      id: "docs",
      icon: "file-text",
      label: "Documentos",
      sublabel: "RG, CPF, comprovantes",
      onPress: () => { Haptics.selectionAsync(); onClose(); },
    },
    {
      id: "personal",
      icon: "user",
      label: "Minha conta",
      sublabel: "Dados pessoais, verificação, segurança",
      onPress: () => { Haptics.selectionAsync(); onClose(); router.push("/conta"); },
    },
    {
      id: "support",
      icon: "message-circle",
      label: "Suporte",
      sublabel: "Tire suas dúvidas",
      onPress: () => { Haptics.selectionAsync(); onClose(); },
    },
    {
      id: "terms",
      icon: "shield",
      label: "Privacidade e termos",
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

  if (!visible) return null;

  return (
    <>
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        onClose={onClose}
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* User info row */}
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>EU</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Minha conta</Text>
              <Text style={styles.userSub}>ID #K-00142</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={10} color={Colors.accentGreen} />
              <Text style={styles.verifiedText}>verificado</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Menu items */}
          <View style={styles.itemsContainer}>
            {menuItems.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={item.onPress}
              >
                <View
                  style={[
                    styles.menuIconWrap,
                    item.danger && { backgroundColor: "#ff3b3015" },
                  ]}
                >
                  <Feather
                    name={item.icon}
                    size={16}
                    color={item.danger ? "#ff3b30" : "#555"}
                  />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={[styles.menuLabel, item.danger && { color: "#ff3b30" }]}>
                    {item.label}
                  </Text>
                  {item.sublabel && (
                    <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                  )}
                </View>
                {!item.danger && (
                  <Feather name="chevron-right" size={14} color="#2a2a2a" />
                )}
              </Pressable>
            ))}
          </View>

          <Text style={styles.version}>Khrono v1.0.0</Text>
        </BottomSheetScrollView>
      </BottomSheet>

      <AppDialog
        visible={logoutDialog}
        title="Sair da conta?"
        message="Você precisará fazer login novamente."
        buttons={[
          { text: "Cancelar", style: "cancel", onPress: () => setLogoutDialog(false) },
          {
            text: "Sair",
            style: "destructive",
            onPress: () => {
              setLogoutDialog(false);
              onClose();
            },
          },
        ]}
        onDismiss={() => setLogoutDialog(false)}
      />
    </>
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 12,
    color: "#444",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  userSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accentGreen + "12",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "30",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: Colors.accentGreen,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: "#141414",
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
  menuItemPressed: {
    backgroundColor: "#111",
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#161616",
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
    color: "#ccc",
  },
  menuSublabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    marginTop: 2,
  },
  version: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#222",
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 4,
  },
});
