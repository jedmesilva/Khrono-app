import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
}

const ICON_COLORS: Record<ToastType, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  success: { icon: "check-circle", color: "#00e5a0" },
  error:   { icon: "x-circle",     color: "#e05050" },
  info:    { icon: "info",          color: "#e06030" },
};

export function Toast({ visible, message, type = "success" }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const { icon, color } = ICON_COLORS[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity,     { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY,  { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity,     { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY,  { toValue: -16, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { top: insets.top + 14 },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Feather name={icon} size={16} color={color} />
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

  function show(message: string, type: ToastType = "success", duration = 2800) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ visible: true, message, type });
    timerRef.current = setTimeout(() => setState((s) => ({ ...s, visible: false })), duration);
  }

  return { toastState: state, show };
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 9999,
    backgroundColor: "#2C2A26",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  text: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#F2EFE9",
    flex: 1,
    lineHeight: 18,
  },
});
