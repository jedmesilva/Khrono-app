import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

const CODE_LENGTH = 6;

export default function CodigoRecuperacaoScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { contact, type } = useLocalSearchParams<{ contact: string; type: string }>();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    sendOtp();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function sendOtp() {
    setSending(true);
    setError(null);
    const email = type === "email" ? contact : `${contact}@khrono.app`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setSending(false);
    if (otpError) {
      setError("Não foi possível enviar o código. Tente novamente.");
    } else {
      setTimeout(() => inputRefs.current[0]?.focus(), 400);
    }
  }

  function shake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError(null);
    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d !== "")) handleVerify(newCode.join(""));
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(codeStr?: string) {
    const token = codeStr ?? code.join("");
    if (token.length < CODE_LENGTH || verifying) return;

    setVerifying(true);
    const email = type === "email" ? contact : `${contact}@khrono.app`;
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (verifyError) {
      setVerifying(false);
      setError("Código inválido ou expirado. Tente novamente.");
      shake();
      setCode(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({
      pathname: "/auth/nova-senha",
      params: { contact, type },
    });
    setVerifying(false);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setCode(Array(CODE_LENGTH).fill(""));
    setError(null);
    await sendOtp();
  }

  const displayContact =
    type === "phone"
      ? `+55 (${contact?.slice(0, 2)}) ${contact?.slice(2, 7)}-${contact?.slice(7)}`
      : contact;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textSecondary} />
        </Pressable>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Feather name="shield" size={28} color="#e06030" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Verifique seu código</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {sending ? "Enviando código..." : "Enviamos um código de 6 dígitos para"}
          </Text>
          {!sending && (
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {displayContact}
            </Text>
          )}

          <Animated.View style={[styles.codeRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array(CODE_LENGTH).fill(0).map((_, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[
                  styles.codeBox,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
                  code[i] ? styles.codeBoxFilled : null,
                  error ? styles.codeBoxError : null,
                ]}
                value={code[i]}
                onChangeText={(v) => handleDigit(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectionColor="#e06030"
                caretHidden
                editable={!sending && !verifying}
              />
            ))}
          </Animated.View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[
              styles.btn,
              (code.join("").length < CODE_LENGTH || verifying || sending) && styles.btnDisabled,
            ]}
            onPress={() => handleVerify()}
            disabled={code.join("").length < CODE_LENGTH || verifying || sending}
          >
            <Text style={styles.btnText}>{verifying ? "Verificando..." : "Verificar código"}</Text>
          </Pressable>

          <Pressable onPress={handleResend} disabled={resendCooldown > 0}>
            <Text style={[styles.resendText, resendCooldown > 0 && { color: colors.textDim }]}>
              {resendCooldown > 0 ? `Reenviar código em ${resendCooldown}s` : "Reenviar código"}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    marginLeft: 16, marginBottom: 8,
  },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "#e0603015", borderWidth: 1, borderColor: "#e0603030",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 28, letterSpacing: -0.8, marginBottom: 10 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 13, marginBottom: 4 },
  contactText: { fontFamily: "DMSans_500Medium", fontSize: 14, marginBottom: 36 },
  codeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  codeBox: {
    flex: 1, height: 56, borderRadius: 14, borderWidth: 1,
    fontFamily: "DMSans_500Medium", fontSize: 22,
  },
  codeBoxFilled: { borderColor: "#e0603050", backgroundColor: "#e0603008" },
  codeBoxError: { borderColor: "#ff444460", backgroundColor: "#ff444408" },
  errorText: {
    fontFamily: "DMSans_400Regular", fontSize: 12,
    color: "#ff4444", marginBottom: 12, paddingLeft: 4,
  },
  btn: {
    backgroundColor: "#e06030", borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: "#fff" },
  resendText: {
    fontFamily: "DMSans_400Regular", fontSize: 12,
    color: "#e06030", textAlign: "center",
  },
});
