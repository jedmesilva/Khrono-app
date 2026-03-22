import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

type Step = "guide" | "capturing" | "done";

export default function VerificacaoFacialScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [step, setStep] = useState<Step>("guide");

  function handleCapture() {
    setStep("capturing");
    setTimeout(() => setStep("done"), 2000);
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <Text style={styles.headerTitle}>Reconhecimento facial</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        {step === "guide" && (
          <>
            <Text style={styles.stepLabel}>ETAPA 1 DE 1</Text>
            <Text style={styles.title}>Posicione seu rosto</Text>
            <Text style={styles.subtitle}>
              Centralize seu rosto dentro do oval e mantenha o olhar na câmera em um ambiente bem iluminado.
            </Text>

            <View style={styles.ovalWrap}>
              <View style={styles.oval}>
                <Feather name="user" size={72} color="#1e1e1e" />
              </View>
              <View style={styles.ovalCornerTL} />
              <View style={styles.ovalCornerTR} />
              <View style={styles.ovalCornerBL} />
              <View style={styles.ovalCornerBR} />
            </View>

            <View style={styles.tipsList}>
              {[
                { icon: "sun" as const,       text: "Ambiente bem iluminado" },
                { icon: "eye" as const,       text: "Olhe diretamente para a câmera" },
                { icon: "slash" as const,     text: "Sem óculos escuros ou chapéu" },
              ].map((tip) => (
                <View key={tip.text} style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Feather name={tip.icon} size={13} color="#555" />
                  </View>
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.captureBtn} onPress={handleCapture}>
              <Feather name="video" size={16} color="#fff" />
              <Text style={styles.captureBtnText}>Iniciar verificação</Text>
            </Pressable>
          </>
        )}

        {step === "capturing" && (
          <>
            <View style={styles.ovalWrap}>
              <View style={[styles.oval, styles.ovalActive]}>
                <Feather name="user" size={72} color={Colors.accent + "30"} />
              </View>
            </View>
            <Text style={styles.title}>Analisando...</Text>
            <Text style={styles.subtitle}>Mantenha o rosto centralizado e não se mova.</Text>
          </>
        )}

        {step === "done" && (
          <>
            <View style={styles.successIconWrap}>
              <View style={styles.successIcon}>
                <Feather name="check" size={40} color={Colors.accentGreen} />
              </View>
            </View>
            <Text style={styles.title}>Verificação enviada!</Text>
            <Text style={styles.subtitle}>
              Sua verificação facial foi enviada para análise. Você será notificado em até 24 horas.
            </Text>
            <Pressable style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>Voltar para a conta</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
    color: "#fff",
  },

  body: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 12,
  },

  stepLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 36,
  },

  ovalWrap: {
    position: "relative",
    width: 200,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  oval: {
    width: 180,
    height: 240,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#1e1e1e",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
  },
  ovalActive: {
    borderColor: Colors.accent + "60",
    borderStyle: "solid",
    backgroundColor: Colors.accent + "08",
  },
  ovalCornerTL: {
    position: "absolute", top: 0, left: 0,
    width: 20, height: 20,
    borderTopWidth: 2, borderLeftWidth: 2,
    borderColor: Colors.accent,
    borderTopLeftRadius: 6,
  },
  ovalCornerTR: {
    position: "absolute", top: 0, right: 0,
    width: 20, height: 20,
    borderTopWidth: 2, borderRightWidth: 2,
    borderColor: Colors.accent,
    borderTopRightRadius: 6,
  },
  ovalCornerBL: {
    position: "absolute", bottom: 0, left: 0,
    width: 20, height: 20,
    borderBottomWidth: 2, borderLeftWidth: 2,
    borderColor: Colors.accent,
    borderBottomLeftRadius: 6,
  },
  ovalCornerBR: {
    position: "absolute", bottom: 0, right: 0,
    width: 20, height: 20,
    borderBottomWidth: 2, borderRightWidth: 2,
    borderColor: Colors.accent,
    borderBottomRightRadius: 6,
  },

  tipsList: {
    width: "100%",
    gap: 10,
    marginBottom: 36,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
  },

  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  captureBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  successIconWrap: {
    marginBottom: 28,
    marginTop: 20,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accentGreen + "10",
    borderWidth: 2,
    borderColor: Colors.accentGreen + "30",
    alignItems: "center",
    justifyContent: "center",
  },

  doneBtn: {
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  doneBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
