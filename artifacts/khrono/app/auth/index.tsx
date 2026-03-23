import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

function detectInputType(value: string): "email" | "phone" | "unknown" {
  if (value.includes("@")) return "email";
  const digits = value.replace(/\D/g, "");
  if (digits.length > 2) return "phone";
  return "unknown";
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function FloatingOrb({
  size,
  color,
  initialX,
  initialY,
  duration,
  delay,
}: {
  size: number;
  color: string;
  initialX: number;
  initialY: number;
  duration: number;
  delay: number;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(x, {
            toValue: 30,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(y, {
            toValue: -20,
            duration: duration * 0.7,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(x, {
            toValue: -15,
            duration: duration * 0.8,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(y, {
            toValue: 25,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(x, {
            toValue: 0,
            duration: duration * 0.9,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(y, {
            toValue: 0,
            duration: duration * 0.6,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: initialX,
        top: initialY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: Animated.multiply(opacity, 0.18),
        transform: [{ translateX: x }, { translateY: y }],
      }}
    />
  );
}

export default function EntradaScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [rawPhone, setRawPhone] = useState("");
  const inputType = detectInputType(input);
  const canContinue = input.length >= 5;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function handleChangeText(text: string) {
    const type = detectInputType(text);
    if (type === "phone" || (type === "unknown" && !text.includes("@"))) {
      const digits = text.replace(/\D/g, "").slice(0, 11);
      setRawPhone(digits);
      setInput(formatPhone(digits));
    } else {
      setInput(text);
    }
  }

  function handleContinue() {
    if (!canContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const contact = inputType === "phone"
      ? rawPhone.replace(/\D/g, "")
      : input.trim();
    router.push({ pathname: "/auth/verificacao", params: { contact, type: inputType } });
  }

  return (
    <View style={styles.container}>
      <FloatingOrb
        size={280}
        color="#ff6b35"
        initialX={-80}
        initialY={-60}
        duration={7000}
        delay={0}
      />
      <FloatingOrb
        size={200}
        color="#ff6b35"
        initialX={width - 140}
        initialY={80}
        duration={9000}
        delay={500}
      />
      <FloatingOrb
        size={160}
        color="#00e5a0"
        initialX={width / 2 - 40}
        initialY={height * 0.25}
        duration={11000}
        delay={800}
      />

      <Animated.View
        style={[
          styles.logoArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>
            Kr<Text style={{ color: "#ff6b35" }}>o</Text>no
          </Text>
        </View>
        <Text style={styles.logoSub}>marketplace de serviços</Text>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.sheetWrap}
      >
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 20, opacity: fadeAnim },
          ]}
        >
          <Text style={styles.sheetTitle}>Entre ou crie sua conta</Text>
          <Text style={styles.sheetSub}>
            Digite seu e-mail ou telefone para continuar
          </Text>

          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              {inputType === "email" ? (
                <Feather name="mail" size={16} color="#ff6b35" />
              ) : inputType === "phone" ? (
                <Feather name="phone" size={16} color="#ff6b35" />
              ) : (
                <Feather name="user" size={16} color="#444" />
              )}
            </View>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={handleChangeText}
              placeholder="e-mail ou telefone"
              placeholderTextColor="#333"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {input.length > 0 && (
              <Pressable
                onPress={() => { setInput(""); setRawPhone(""); }}
                style={styles.clearBtn}
              >
                <Feather name="x" size={14} color="#444" />
              </Pressable>
            )}
          </View>

          {inputType !== "unknown" && input.length > 0 && (
            <View style={styles.detectedBadge}>
              <Feather
                name={inputType === "email" ? "mail" : "phone"}
                size={10}
                color="#ff6b35"
              />
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
            <Text style={{ color: "#555" }}>Termos de Uso</Text> e a{" "}
            <Text style={{ color: "#555" }}>Política de Privacidade</Text>
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060606",
  },
  logoArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  logoWrap: {
    marginBottom: 12,
  },
  logoText: {
    fontFamily: "Sora_700Bold",
    fontSize: 48,
    color: "#ffffff",
    letterSpacing: -2,
  },
  logoSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sheetWrap: {
    width: "100%",
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
    marginBottom: 20,
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
