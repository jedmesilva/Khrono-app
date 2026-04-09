import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/context/ThemeContext";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

type Props = {
  visible: boolean;
  message: string;
  subtitle?: string;
  icon?: FeatherName;
};

export function ConnectingFeedback({
  visible,
  message,
  subtitle = "Aguarde um momento",
  icon = "link-2",
}: Props) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [visible]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.spinRing, spinStyle]} />
        <View style={[styles.iconInner, { backgroundColor: "#e0603012", borderColor: "#e0603025" }]}>
          <Feather name={icon} size={22} color="#e06030" />
        </View>
      </View>

      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  spinRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderTopColor: "#e06030",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
