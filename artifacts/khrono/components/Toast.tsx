import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
}

const CONFIGS: Record<ToastType, { bg: string; icon: keyof typeof Feather.glyphMap }> = {
  success: { bg: "#18a06b", icon: "check-circle" },
  error:   { bg: "#ff3b30", icon: "x-circle" },
  info:    { bg: "#e06030", icon: "info" },
};

export function Toast({ visible, message, type = "success" }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const { bg, icon } = CONFIGS[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: bg, bottom: insets.bottom + 24 },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Feather name={icon} size={15} color="#fff" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

export function useToast() {
  const [state, setState] = React.useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: "",
    type: "success",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(message: string, type: ToastType = "success", duration = 2500) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ visible: true, message, type });
    timerRef.current = setTimeout(() => setState((s) => ({ ...s, visible: false })), duration);
  }

  return { toastState: state, show };
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  text: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
    flex: 1,
    lineHeight: 18,
  },
});
