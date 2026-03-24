import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { findMockUser } from "@/constants/mockUsers";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { contact, type, name, firstName } = useLocalSearchParams<{
    contact: string;
    type: string;
    name: string;
    firstName: string;
  }>();

  const { completeOnboarding } = useAuth();
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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
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

    const user = findMockUser(contact ?? "");
    if (!user || senha !== user.password) {
      setError(true);
      shake();
      setSenha("");
      return;
    }

    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await completeOnboarding({
      contact: contact ?? "",
      name: user.name,
      firstName: user.firstName,
    });
  }

  function handleForgotPassword() {
    router.push({ pathname: "/auth/verificacao", params: { contact, type } });
  }

  const displayContact =
    type === "phone"
      ? `(${contact?.slice(0, 2)}) ${contact?.slice(2, 7)}-${contact?.slice(7)}`
      : contact;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#888" />
          </Pressable>

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Feather name="lock" size={28} color="#ff6b35" />
            </View>

            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>
              {firstName ? `Olá, ${firstName}! ` : ""}Digite sua senha para entrar.
            </Text>

            <View style={styles.contactChip}>
              <Feather
                name={type === "email" ? "mail" : "smartphone"}
                size={13}
                color="#ff6b35"
              />
              <Text style={styles.contactChipText}>{displayContact}</Text>
            </View>

            <Text style={styles.label}>Senha</Text>
            <Animated.View
              style={[styles.inputWrap, error && styles.inputWrapError, { transform: [{ translateX: shakeAnim }] }]}
            >
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={senha}
                onChangeText={(t) => { setSenha(t); setError(false); }}
                secureTextEntry={!showSenha}
                placeholder="sua senha"
                placeholderTextColor="#333"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowSenha(!showSenha)} style={styles.eyeBtn}>
                <Feather name={showSenha ? "eye-off" : "eye"} size={16} color="#444" />
              </Pressable>
            </Animated.View>

            {error && (
              <Text style={styles.errorText}>Senha incorreta. Tente novamente.</Text>
            )}

            <Text style={styles.hintText}>
              Dica: use <Text style={{ color: "#ff6b35", fontFamily: "DMMono_500Medium" }}>senha123</Text> para testar
            </Text>

            <Pressable onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <Animated.View
          style={[styles.footer, { paddingBottom: insets.bottom + 20, opacity: fadeAnim }]}
        >
          <Pressable
            style={[styles.btn, (senha.length < 1 || loading) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={senha.length < 1 || loading}
          >
            <Text style={styles.btnText}>{loading ? "Entrando..." : "Entrar"}</Text>
            {!loading && <Feather name="arrow-right" size={16} color="#fff" />}
          </Pressable>
        </Animated.View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060606",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#ff6b3515",
    borderWidth: 1,
    borderColor: "#ff6b3530",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    color: "#fff",
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#555",
    marginBottom: 20,
    lineHeight: 20,
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    backgroundColor: "#ff6b3510",
    borderWidth: 1,
    borderColor: "#ff6b3525",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 32,
  },
  contactChipText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 12,
    color: "#ff6b35",
  },
  label: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
    color: "#555",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 8,
  },
  inputWrapError: {
    borderColor: "#ff444460",
    backgroundColor: "#ff444408",
  },
  input: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 15,
    color: "#fff",
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#ff4444",
    marginBottom: 8,
    paddingLeft: 4,
  },
  hintText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
    marginBottom: 24,
    paddingLeft: 4,
  },
  forgotBtn: {
    alignSelf: "flex-start",
  },
  forgotText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
    textDecorationLine: "underline",
  },
  footer: {
    paddingHorizontal: 28,
    backgroundColor: "#060606",
  },
  btn: {
    backgroundColor: "#ff6b35",
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
