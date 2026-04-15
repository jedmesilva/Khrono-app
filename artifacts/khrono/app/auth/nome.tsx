import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

export default function NomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { contact, type, password } = useLocalSearchParams<{
    contact: string; type: string; password: string;
  }>();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const canProceed = nome.trim().length >= 2;
  const firstName = nome.trim().split(" ")[0] ?? "";

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  async function handleProceed() {
    if (!canProceed || loading) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const email = type === "email" ? contact : `${contact}@khrono.app`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: nome.trim(), first_name: firstName } },
      });

      if (error) {
        setLoading(false);
        Alert.alert("Erro ao criar conta", error.message);
        return;
      }

      if (!data.user) {
        setLoading(false);
        Alert.alert("Erro", "Não foi possível criar a conta. Tente novamente.");
        return;
      }

      router.push({
        pathname: "/auth/verificacao",
        params: { contact, type, mode: "signup", firstName, userId: data.user.id },
      });
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Erro inesperado", e?.message ?? "Tente novamente.");
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Feather name="smile" size={28} color="#e06030" />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Como você se chama?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Seu nome será exibido para quem você contratar e para quem te contratar.
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Nome completo</Text>
            <View style={[
              styles.inputWrap,
              { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
              nome.length > 0 && styles.inputWrapActive,
            ]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text }]}
                value={nome}
                onChangeText={setNome}
                placeholder="Ex: Carlos Silva"
                placeholderTextColor={colors.textDim}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleProceed}
              />
              {nome.length > 0 && (
                <Pressable onPress={() => setNome("")} style={styles.clearBtn}>
                  <Feather name="x" size={14} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {firstName.length > 1 && (
              <View style={[styles.previewWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Como vamos te chamar:</Text>
                <Text style={[styles.previewName, { color: colors.text }]}>Olá, {firstName} 👋</Text>
              </View>
            )}
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <Pressable
              style={[styles.btn, (!canProceed || loading) && styles.btnDisabled]}
              onPress={handleProceed}
              disabled={!canProceed || loading}
            >
              <Text style={styles.btnText}>{loading ? "Criando conta..." : "Continuar"}</Text>
              {!loading && <Feather name="arrow-right" size={16} color="#fff" />}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: "#e0603015",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 28, letterSpacing: -0.8, marginBottom: 10 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 13, marginBottom: 32, lineHeight: 20 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, height: 52,
  },
  inputWrapActive: { borderColor: "#e0603040" },
  input: { flex: 1, fontFamily: "Sora_400Regular", fontSize: 16 },
  clearBtn: { padding: 4 },
  previewWrap: { marginTop: 20, padding: 16, borderRadius: 14, borderWidth: 1 },
  previewLabel: { fontFamily: "DMSans_400Regular", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  previewName: { fontFamily: "Sora_600SemiBold", fontSize: 18 },
  footer: { paddingHorizontal: 28 },
  btn: {
    backgroundColor: "#e06030", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: "#fff" },
});
