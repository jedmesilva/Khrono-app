import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
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
        <Feather name="zap" size={22} color="#fff" />
      </View>
    </Pressable>
  );
}

function TabLayoutInner() {
  const safeAreaInsets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { isOpen, closeSheet } = useHireSheet();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.tabIconDefault,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : "#0a0a0a",
            borderTopWidth: 1,
            borderTopColor: "#111",
            elevation: 0,
            paddingBottom: isWeb ? 0 : safeAreaInsets.bottom,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={80}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: "#0a0a0a" },
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
                <SymbolView name="creditcard" tintColor={color} size={22} />
              ) : (
                <Feather name="credit-card" size={22} color={color} />
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
  },
  centerTabButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
});
