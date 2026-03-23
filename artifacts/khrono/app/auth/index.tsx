import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Reanimated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type InputType = "email" | "phone" | "unknown";

function detectInputType(value: string): InputType {
  if (value.includes("@")) return "email";
  const onlyDigitsAndFormatting = /^[\d\s()\-+]+$/.test(value) && value.length > 0;
  if (onlyDigitsAndFormatting) return "phone";
  return "unknown";
}

function formatPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function FloatingOrb({
  size,
  color,
  x,
  y,
  duration,
  delay,
}: {
  size: number;
  color: string;
  x: number;
  y: number;
  duration: number;
  delay: number;
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(tx, { toValue: 28, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ty, { toValue: -18, duration: duration * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(tx, { toValue: -14, duration: duration * 0.85, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ty, { toValue: 22, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(tx, { toValue: 0, duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ty, { toValue: 0, duration: duration * 0.6, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: Animated.multiply(opacity, 0.15),
        transform: [{ translateX: tx }, { translateY: ty }],
      }}
    />
  );
}

export default function EntradaScreen() {
  const insets = useSafeAreaInsets();
  const [rawValue, setRawValue] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const inputType = detectInputType(displayValue);
  const canContinue = displayValue.trim().length >= 5;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const sheetFade = useSharedValue(0);
  const keyboardProgress = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (e) => {
        "worklet";
        keyboardProgress.value = e.progress;
      },
      onEnd: (e) => {
        "worklet";
        keyboardProgress.value = e.progress;
      },
    },
    []
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    sheetFade.value = withDelay(200, withTiming(1, { duration: 700 }));
  }, []);

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    const paddingBottom = interpolate(
      keyboardProgress.value,
      [0, 1],
      [insets.bottom + 20, 20]
    );
    return {
      opacity: sheetFade.value,
      paddingBottom,
    };
  });

  function handleChangeText(text: string) {
    if (text === "") {
      setRawValue("");
      setDisplayValue("");
      return;
    }

    if (text.includes("@")) {
      setRawValue(text);
      setDisplayValue(text);
      return;
    }

    const onlyDigits = text.replace(/\D/g, "");
    const hadDigitsOnly = /^[\d\s()\-]+$/.test(displayValue) || displayValue === "";

    if (onlyDigits.length > 0 && hadDigitsOnly && !text.match(/[a-zA-Z]/)) {
      const digits = onlyDigits.slice(0, 11);
      setRawValue(digits);
      setDisplayValue(formatPhone(digits));
    } else {
      setRawValue(text);
      setDisplayValue(text);
    }
  }

  function handleClear() {
    setRawValue("");
    setDisplayValue("");
  }

  function handleContinue() {
    if (!canContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const contact = inputType === "phone"
      ? rawValue.replace(/\D/g, "")
      : displayValue.trim();
    router.push({ pathname: "/auth/verificacao", params: { contact, type: inputType } });
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.background} pointerEvents="none">
        <FloatingOrb size={280} color="#ff6b35" x={-80} y={-60} duration={7000} delay={0} />
        <FloatingOrb size={200} color="#ff6b35" x={width - 140} y={80} duration={9000} delay={500} />
        <FloatingOrb size={160} color="#00e5a0" x={width / 2 - 40} y={180} duration={11000} delay={800} />
      </View>

      <Animated.View
        style={[styles.logoArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        pointerEvents="none"
      >
        <Text style={styles.logoText}>
          Kr<Text style={{ color: "#ff6b35" }}>o</Text>no
        </Text>
        <Text style={styles.logoSub}>marketplace de serviços</Text>
      </Animated.View>

      <Reanimated.View style={[styles.sheet, sheetAnimatedStyle]}>
        <Text style={styles.sheetTitle}>Entre ou crie sua conta</Text>
        <Text style={styles.sheetSub}>Digite seu e-mail ou telefone para continuar</Text>

        <View style={[styles.inputWrap, displayValue.length > 0 && styles.inputWrapActive]}>
          <View style={styles.inputIconWrap}>
            {inputType === "email" ? (
              <Feather name="mail" size={16} color="#ff6b35" />
            ) : inputType === "phone" ? (
              <Feather name="phone" size={16} color="#ff6b35" />
            ) : (
              <Feather name="at-sign" size={16} color="#444" />
            )}
          </View>
          <TextInput
            style={styles.input}
            value={displayValue}
            onChangeText={handleChangeText}
            placeholder="e-mail ou telefone"
            placeholderTextColor="#333"
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
          {displayValue.length > 0 && (
            <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
              <Feather name="x" size={14} color="#444" />
            </Pressable>
          )}
        </View>

        {inputType !== "unknown" && displayValue.length > 0 && (
          <View style={styles.detectedBadge}>
            <Feather name={inputType === "email" ? "mail" : "phone"} size={10} color="#ff6b35" />
            <Text style={styles.detectedText}>
              {inputType === "email" ? "e-mail detectado" : "telefone detectado"}
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.btnText}>Continuar</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </Pressable>

        <Text style={styles.terms}>
          Ao continuar, você aceita os{" "}
          <Text style={{ color: "#555" }}>Termos de Uso</Text>
          {" "}e a{" "}
          <Text style={{ color: "#555" }}>Política de Privacidade</Text>
        </Text>
      </Reanimated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060606",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  logoArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Sora_700Bold",
    fontSize: 52,
    color: "#ffffff",
    letterSpacing: -2,
    marginBottom: 10,
  },
  logoSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sheet: {
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#1a1a1a",
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  sheetTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    color: "#ffffff",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sheetSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
    marginBottom: 24,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 8,
  },
  inputWrapActive: {
    borderColor: "#ff6b3540",
  },
  inputIconWrap: {
    marginRight: 10,
    width: 20,
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 15,
    color: "#fff",
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  detectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 16,
    paddingLeft: 4,
  },
  detectedText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#ff6b35",
    letterSpacing: 0.5,
  },
  btn: {
    backgroundColor: "#ff6b35",
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  terms: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    textAlign: "center",
    lineHeight: 16,
  },
});
