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

import { BackButton } from "@/components/BackButton";
import { useTheme } from "@/context/ThemeContext";

type Step = "guide" | "capturing" | "done";

export default function VerificacaoFacialScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [step, setStep] = useState<Step>("guide");

  function handleCapture() {
    setStep("capturing");
    setTimeout(() => setStep("done"), 2000);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reconhecimento facial</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        {step === "guide" && (
          <>
            <Text style={[styles.stepLabel, { color: colors.textDim }]}>ETAPA 1 DE 1</Text>
            <Text style={[styles.title, { color: colors.text }]}>Posicione seu rosto</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Centralize seu rosto dentro do oval e mantenha o olhar na câmera em um ambiente bem iluminado.
            </Text>

            <View style={styles.ovalWrap}>
              <View style={[styles.oval, { borderColor: colors.inputBorder, backgroundColor: colors.card }]}>
                <Feather name="user" size={72} color={colors.cardBorder} />
              </View>
              <View style={styles.ovalCornerTL} />
              <View style={styles.ovalCornerTR} />
              <View style={styles.ovalCornerBL} />
              <View style={styles.ovalCornerBR} />
            </View>

            <View style={styles.tipsList}>
              {[
                { icon: "sun" as const, text: "Ambiente bem iluminado" },
                { icon: "eye" as const, text: "Olhe diretamente para a câmera" },
                { icon: "slash" as const, text: "Sem óculos escuros ou chapéu" },
              ].map((tip) => (
                <View key={tip.text} style={styles.tipItem}>
                  <View style={[styles.tipIcon, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <Feather name={tip.icon} size={13} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip.text}</Text>
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
                <Feather name="user" size={72} color="#e0603030" />
              </View>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Analisando...</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Mantenha o rosto centralizado e não se mova.</Text>
          </>
        )}

        {step === "done" && (
          <>
            <View style={styles.successIconWrap}>
              <View style={styles.successIcon}>
                <Feather name="check" size={40} color="#18a06b" />
              </View>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Verificação enviada!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sua verificação facial foi enviada para análise. Você será notificado em até 24 horas.
            </Text>
            <Pressable style={[styles.doneBtn, { borderColor: colors.inputBorder }]} onPress={() => router.back()}>
              <Text style={[styles.doneBtnText, { color: colors.text }]}>Voltar para a conta</Text>
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Sora_700Bold", fontSize: 16 },
  body: { flex: 1, alignItems: "center", paddingHorizontal: 28, paddingTop: 12 },
  stepLabel: { fontFamily: "DMSans_400Regular", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  title: { fontFamily: "Sora_700Bold", fontSize: 22, textAlign: "center", marginBottom: 10 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18, marginBottom: 36 },
  ovalWrap: { position: "relative", width: 200, height: 260, alignItems: "center", justifyContent: "center", marginBottom: 36 },
  oval: {
    width: 180, height: 240, borderRadius: 100,
    borderWidth: 2, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  ovalActive: { borderColor: "#e0603060", borderStyle: "solid", backgroundColor: "#e0603008" },
  ovalCornerTL: { position: "absolute", top: 0, left: 0, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: "#e06030", borderTopLeftRadius: 6 },
  ovalCornerTR: { position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: "#e06030", borderTopRightRadius: 6 },
  ovalCornerBL: { position: "absolute", bottom: 0, left: 0, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: "#e06030", borderBottomLeftRadius: 6 },
  ovalCornerBR: { position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: "#e06030", borderBottomRightRadius: 6 },
  tipsList: { width: "100%", gap: 10, marginBottom: 36 },
  tipItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  tipIcon: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tipText: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  captureBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#e06030", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  captureBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 14, color: "#fff" },
  successIconWrap: { marginBottom: 28, marginTop: 20 },
  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "#18a06b10", borderWidth: 2, borderColor: "#18a06b30",
    alignItems: "center", justifyContent: "center",
  },
  doneBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1 },
  doneBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 14 },
});
