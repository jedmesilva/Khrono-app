import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

type InputMode = "email" | "phone";

function formatPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function EntradaScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [inputMode, setInputMode] = useState<InputMode>("email");
  const [rawValue, setRawValue] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isEmail = inputMode === "email";
  const canContinue = isEmail
    ? displayValue.trim().length >= 5 && displayValue.includes("@")
    : rawValue.length === 11;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  function switchMode(mode: InputMode) {
    setInputMode(mode);
    setRawValue("");
    setDisplayValue("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleChangeText(text: string) {
    if (isEmail) {
      setRawValue(text);
      setDisplayValue(text);
      return;
    }

    if (text === "") {
      setRawValue("");
      setDisplayValue("");
      return;
    }

    const onlyDigits = text.replace(/\D/g, "").slice(0, 11);
    setRawValue(onlyDigits);
    setDisplayValue(formatPhone(onlyDigits));
  }

  function handleClear() {
    setRawValue("");
    setDisplayValue("");
  }

  async function handleContinue() {
    if (!canContinue || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);

    const contact = isEmail ? displayValue.trim() : rawValue;

    try {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq(isEmail ? "email" : "phone", isEmail ? contact : `+55${contact}`)
        .maybeSingle();

      if (data) {
        router.push({ pathname: "/auth/login", params: { contact, type: isEmail ? "email" : "phone" } });
      } else {
        router.push({ pathname: "/auth/senha", params: { contact, type: isEmail ? "email" : "phone" } });
      }
    } catch {
      router.push({ pathname: "/auth/senha", params: { contact, type: isEmail ? "email" : "phone" } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Image
        source={require("@/assets/images/krnoconcept.webp")}
        style={styles.bgImage}
        resizeMode="cover"
        pointerEvents="none"
      />

      <View style={styles.spacer} />

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 20, opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {isEmail ? "Qual é o seu e-mail?" : "Qual é o seu telefone?"}
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, displayValue.length > 0 && styles.inputWrapActive]}>
            <View style={styles.inputIconWrap}>
              <Feather
                name={isEmail ? "mail" : "phone"}
                size={16}
                color={displayValue.length > 0 ? "#e06030" : colors.textMuted}
              />
            </View>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              value={displayValue}
              onChangeText={handleChangeText}
              placeholder={isEmail ? "seu@email.com" : "(11) 99999-9999"}
              placeholderTextColor={colors.textDim}
              keyboardType={isEmail ? "email-address" : "phone-pad"}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isEmail ? "email" : "tel"}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              autoFocus
            />
            {displayValue.length > 0 && (
              <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
                <Feather name="x" size={14} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          <Pressable
            style={[styles.btn, (!canContinue || loading) && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>Continuar</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.btnSecondary, { borderColor: colors.inputBorder }]}
            onPress={() => switchMode(isEmail ? "phone" : "email")}
          >
            <Feather name={isEmail ? "phone" : "mail"} size={14} color={colors.textSecondary} />
            <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>
              {isEmail ? "Continuar com telefone" : "Continuar com e-mail"}
            </Text>
          </Pressable>

          <Text style={[styles.terms, { color: colors.textDim }]}>
            Ao continuar, você aceita os{" "}
            <Text style={{ color: colors.textSecondary }}>Termos de Uso</Text>
            {" "}e a{" "}
            <Text style={{ color: colors.textSecondary }}>Política de Privacidade</Text>
          </Text>
        </Animated.View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  spacer: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  sheetTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
  },
  inputWrapActive: {
    borderColor: "#e0603040",
  },
  inputIconWrap: {
    marginRight: 10,
    width: 20,
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  btn: {
    backgroundColor: "#e06030",
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  btnSecondary: {
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  btnSecondaryText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
  },
  terms: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 12,
  },
});
