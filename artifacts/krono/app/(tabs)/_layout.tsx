import { BlurView } from "expo-blur";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import * as Haptics from "@/lib/haptics";
import { Tabs } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { HireSheet } from "@/components/HireSheet";
import { HireSheetProvider, useHireSheet } from "@/context/HireSheetContext";

function CenterTabButton() {
  const { openSheet } = useHireSheet();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        openSheet();
      }}
      style={styles.centerTabButton}
    >
      <View style={styles.centerTabButtonInner}>
        <MaterialCommunityIcons name="handshake-outline" size={24} color="#fff" />
      </View>
    </Pressable>
  );
}

function TabLayoutInner() {
  const safeAreaInsets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { isOpen, closeSheet } = useHireSheet();
  const { colors, isDark } = useTheme();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.surface,
            elevation: 0,
            overflow: "visible",
            paddingBottom: isWeb ? 0 : safeAreaInsets.bottom,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={80}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: colors.card },
                ]}
              />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="house" tintColor={color} size={22} />
              ) : (
                <Feather name="home" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explorar",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="magnifyingglass" tintColor={color} size={22} />
              ) : (
                <Feather name="search" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="hire"
          options={{
            title: "",
            tabBarButton: () => <CenterTabButton />,
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: "Carteira",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="wallet.pass" tintColor={color} size={22} />
              ) : (
                <MaterialCommunityIcons name="wallet-outline" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="person" tintColor={color} size={22} />
              ) : (
                <Feather name="user" size={22} color={color} />
              ),
          }}
        />
      </Tabs>
      <HireSheet open={isOpen} onClose={closeSheet} />
    </>
  );
}

export default function TabLayout() {
  return (
    <HireSheetProvider>
      <TabLayoutInner />
    </HireSheetProvider>
  );
}

const styles = StyleSheet.create({
  centerTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    top: -10,
    overflow: "visible",
  },
  centerTabButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e06030",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e06030",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
});
