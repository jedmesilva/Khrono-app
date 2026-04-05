import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { contact, type } = useLocalSearchParams<{
    contact: string;
    type: string;
  }>();

  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    setTimeout(() => inputRef.current?.focus(), 450);
  }, []);

  function shake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogin() {
    if (senha.length < 1 || loading) return;
    setLoading(true);
    const email = type === "email" ? contact : `${contact}@khrono.app`;
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (authError) {
      setLoading(false);
      setError(true);
      shake();
      setSenha("");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleForgotPassword() {
    router.push({ pathname: "/auth/codigo-recuperacao", params: { contact, type } });
  }

  const displayContact = type === "phone"
    ? `(${contact?.slice(0, 2)}) ${contact?.slice(2, 7)}-${contact?.slice(7)}`
    : contact;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Feather name="lock" size={28} color="#e06030" />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Bem-vindo de volta</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Digite sua senha para entrar.</Text>

            <View style={styles.contactChip}>
              <Feather name={type === "email" ? "mail" : "smartphone"} size={13} color="#e06030" />
              <Text style={styles.contactChipText}>{displayContact}</Text>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Senha</Text>
            <Animated.View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                error && styles.inputWrapError,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text }]}
                value={senha}
                onChangeText={(t) => { setSenha(t); setError(false); }}
                secureTextEntry={!showSenha}
                placeholder="sua senha"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowSenha(!showSenha)} style={styles.eyeBtn}>
                <Feather name={showSenha ? "eye-off" : "eye"} size={16} color={colors.textMuted} />
              </Pressable>
            </Animated.View>

            {error && <Text style={styles.errorText}>Senha incorreta. Tente novamente.</Text>}

            <Pressable onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: colors.textSecondary }]}>Esqueci minha senha</Text>
            </Pressable>

            <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 4, opacity: fadeAnim }]}>
              <Pressable
                style={[styles.btn, (senha.length < 1 || loading) && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={senha.length < 1 || loading}
              >
                <Text style={styles.btnText}>{loading ? "Entrando..." : "Entrar"}</Text>
                {!loading && <Feather name="arrow-right" size={16} color="#fff" />}
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    width: 40, height: 40,
    alignItems: "center", justifyContent: "center",
    marginLeft: 16, marginBottom: 8,
  },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "#e0603015", borderWidth: 1, borderColor: "#e0603030",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 28, letterSpacing: -0.8, marginBottom: 8 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 13, marginBottom: 20, lineHeight: 20 },
  contactChip: {
    flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start",
    backgroundColor: "#e0603010", borderWidth: 1, borderColor: "#e0603025",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 32,
  },
  contactChipText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#e06030" },
  label: { fontFamily: "DMSans_500Medium", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, height: 52, marginBottom: 8,
  },
  inputWrapError: { borderColor: "#ff444460", backgroundColor: "#ff444408" },
  input: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 15 },
  eyeBtn: { padding: 4 },
  errorText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "#ff4444", marginBottom: 8, paddingLeft: 4 },
  forgotBtn: { alignSelf: "flex-start", marginTop: 4 },
  forgotText: { fontFamily: "DMSans_400Regular", fontSize: 12, textDecorationLine: "underline" },
  footer: { marginTop: 32 },
  btn: {
    backgroundColor: "#e06030", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: "#fff" },
});
