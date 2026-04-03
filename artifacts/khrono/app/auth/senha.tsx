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
import { useTheme } from "@/context/ThemeContext";

function getStrength(pw: string): { level: number; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: "", color: "#1e1e1e" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "fraca", color: "#ff4444" };
  if (score === 2) return { level: 2, label: "média", color: "#ffaa00" };
  if (score === 3) return { level: 3, label: "boa", color: "#00c47a" };
  return { level: 4, label: "forte", color: "#00e5a0" };
}

export default function SenhaScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { contact, type } = useLocalSearchParams<{ contact: string; type: string }>();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const strength = getStrength(senha);
  const senhaOk = senha.length >= 6;
  const confirmOk = confirmar === senha && senha.length >= 6;
  const canProceed = senhaOk && confirmOk;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  function handleProceed() {
    if (!canProceed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/auth/nome", params: { contact, type, password: senha } });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Feather name="lock" size={28} color="#ff6b35" />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Crie sua senha</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ela protege sua conta. Use letras, números e símbolos.
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Senha</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!showSenha}
                placeholder="mínimo 6 caracteres"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowSenha(!showSenha)} style={styles.eyeBtn}>
                <Feather name={showSenha ? "eye-off" : "eye"} size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            {senha.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: i <= strength.level ? strength.color : colors.cardBorder },
                      ]}
                    />
                  ))}
                </View>
                {strength.label ? (
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                ) : null}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 20, color: colors.textSecondary }]}>Confirmar senha</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={confirmar}
                onChangeText={setConfirmar}
                secureTextEntry={!showConfirmar}
                placeholder="repita a senha"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowConfirmar(!showConfirmar)} style={styles.eyeBtn}>
                <Feather name={showConfirmar ? "eye-off" : "eye"} size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            {confirmar.length > 0 && !confirmOk && (
              <Text style={styles.errorText}>As senhas não coincidem</Text>
            )}
            {confirmOk && (
              <View style={styles.matchRow}>
                <Feather name="check" size={12} color="#00e5a0" />
                <Text style={styles.matchText}>Senhas coincidem</Text>
              </View>
            )}

            <Pressable
              style={[styles.btn, !canProceed && styles.btnDisabled, { marginTop: 32 }]}
              onPress={handleProceed}
              disabled={!canProceed}
            >
              <Text style={styles.btnText}>Definir senha</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    marginLeft: 16, marginBottom: 8,
  },
  content: { paddingHorizontal: 28, paddingTop: 20 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "#ff6b3515", borderWidth: 1, borderColor: "#ff6b3530",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 28, letterSpacing: -0.8, marginBottom: 10 },
  subtitle: { fontFamily: "DMMono_400Regular", fontSize: 13, marginBottom: 32, lineHeight: 20 },
  label: { fontFamily: "DMMono_500Medium", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, height: 52,
  },
  input: { flex: 1, fontFamily: "DMMono_400Regular", fontSize: 15 },
  eyeBtn: { padding: 4 },
  strengthWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  strengthBars: { flexDirection: "row", gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontFamily: "DMMono_400Regular", fontSize: 11, letterSpacing: 0.5 },
  errorText: { fontFamily: "DMMono_400Regular", fontSize: 11, color: "#ff4444", marginTop: 8, paddingLeft: 4 },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingLeft: 4 },
  matchText: { fontFamily: "DMMono_400Regular", fontSize: 11, color: "#00e5a0" },
  btn: {
    backgroundColor: "#ff6b35", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: "#fff" },
});
