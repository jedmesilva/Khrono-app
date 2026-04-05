import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

export default function BoasVindasScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { firstName } = useLocalSearchParams<{ firstName: string }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={{ opacity: checkOpacity }}>
            <Text style={styles.checkIcon}>✓</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.checkRing,
              {
                opacity: Animated.multiply(checkOpacity, 0.3),
                transform: [{ scale: Animated.multiply(scaleAnim, 1.3) }],
              },
            ]}
          />
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: fadeAnim, transform: [{ translateY: textSlide }] }]}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Olá, <Text style={{ color: "#ff6b35" }}>{firstName}</Text>!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sua conta foi criada com sucesso.</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Agora você pode criar e gerenciar contratos baseados no tempo, sozinho ou com outras pessoas — tudo em um só lugar.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 24, opacity: fadeAnim }]}>
        <Pressable style={styles.btn} onPress={handleStart}>
          <Text style={styles.btnText}>Começar</Text>
        </Pressable>

        <View style={styles.taglineRow}>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            Kr<Text style={{ color: "#ff6b35" }}>o</Text>no
          </Text>
          <Text style={[styles.taglineSub, { color: colors.textDim }]}>· app de contratos</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  checkCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#00e5a015", borderWidth: 2, borderColor: "#00e5a040",
    alignItems: "center", justifyContent: "center", marginBottom: 36,
  },
  checkRing: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: "#00e5a0",
  },
  checkIcon: { fontSize: 42, color: "#00e5a0", lineHeight: 50 },
  textBlock: { alignItems: "center", gap: 10 },
  greeting: { fontFamily: "Sora_700Bold", fontSize: 32, letterSpacing: -1, textAlign: "center" },
  subtitle: { fontFamily: "DMMono_500Medium", fontSize: 13, textAlign: "center" },
  body: { fontFamily: "DMMono_400Regular", fontSize: 12, textAlign: "center", lineHeight: 20, marginTop: 8 },
  footer: { paddingHorizontal: 28, gap: 20, alignItems: "center" },
  btn: {
    backgroundColor: "#ff6b35", borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", width: "100%",
  },
  btnText: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: "#fff" },
  taglineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tagline: { fontFamily: "Sora_700Bold", fontSize: 14, letterSpacing: -0.5 },
  taglineSub: { fontFamily: "DMMono_400Regular", fontSize: 11 },
});
