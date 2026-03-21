import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { type CardBandeira, useCards } from "@/context/CardsContext";

type Step = "form" | "success";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function detectBandeira(num: string): CardBandeira {
  const clean = num.replace(/\s/g, "");
  if (clean.startsWith("4")) return "Visa";
  return "Mastercard";
}

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

export function AddCardModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addCard } = useCards();

  const [step, setStep] = useState<Step>("form");
  const [numero, setNumero] = useState("");
  const [titular, setTitular] = useState("");
  const [validade, setValidade] = useState("");
  const [cvv, setCvv] = useState("");

  const digits = numero.replace(/\s/g, "");
  const isValid =
    digits.length === 16 &&
    titular.trim().length > 2 &&
    validade.length === 5 &&
    cvv.length === 3;

  const bandeira = detectBandeira(numero);
  const lastFour = digits.slice(-4) || "••••";

  function handleClose() {
    setStep("form");
    setNumero("");
    setTitular("");
    setValidade("");
    setCvv("");
    onClose();
  }

  function handleAdd() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addCard({
      bandeira,
      numero: lastFour,
      titular: titular.trim(),
      validade,
    });
    setStep("success");
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavWrapper}
        pointerEvents="box-none"
      >
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
        >
          <View style={styles.handle} />

          {step === "form" && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Adicionar cartão</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Feather name="x" size={18} color="#555" />
                </Pressable>
              </View>

              {/* Card preview */}
              <View style={styles.cardPreview}>
                <View style={styles.cardPreviewTop}>
                  <View style={styles.cardChip} />
                  <Text style={styles.cardBandeiraText}>{bandeira}</Text>
                </View>
                <Text style={styles.cardNumPreview}>
                  {numero.length > 0
                    ? numero.padEnd(19, " •").slice(0, 19)
                    : "•••• •••• •••• ••••"}
                </Text>
                <View style={styles.cardPreviewBottom}>
                  <View>
                    <Text style={styles.cardPreviewLabel}>TITULAR</Text>
                    <Text style={styles.cardPreviewValue}>
                      {titular.trim().toUpperCase() || "SEU NOME"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.cardPreviewLabel}>VALIDADE</Text>
                    <Text style={styles.cardPreviewValue}>
                      {validade || "MM/AA"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Number */}
              <Text style={styles.fieldLabel}>NÚMERO DO CARTÃO</Text>
              <TextInput
                style={styles.input}
                value={numero}
                onChangeText={(t) => setNumero(formatCardNumber(t))}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor="#333"
                keyboardType="numeric"
                maxLength={19}
              />

              {/* Titular */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                NOME DO TITULAR
              </Text>
              <TextInput
                style={styles.input}
                value={titular}
                onChangeText={setTitular}
                placeholder="Como aparece no cartão"
                placeholderTextColor="#333"
                autoCapitalize="words"
              />

              {/* Expiry + CVV */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                    VALIDADE
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={validade}
                    onChangeText={(t) => setValidade(formatExpiry(t))}
                    placeholder="MM/AA"
                    placeholderTextColor="#333"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                    CVV
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={cvv}
                    onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 3))}
                    placeholder="•••"
                    placeholderTextColor="#333"
                    keyboardType="numeric"
                    maxLength={3}
                    secureTextEntry
                  />
                </View>
              </View>

              <Pressable
                style={[
                  styles.addBtn,
                  !isValid && styles.addBtnDisabled,
                ]}
                onPress={isValid ? handleAdd : undefined}
              >
                <Feather name="credit-card" size={16} color={isValid ? "#000" : "#333"} />
                <Text style={[styles.addBtnText, !isValid && { color: "#333" }]}>
                  Adicionar cartão
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {step === "success" && (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Feather name="check" size={32} color={Colors.accentGreen} />
              </View>
              <Text style={styles.successTitle}>Cartão adicionado!</Text>
              <Text style={styles.successSub}>
                {bandeira} •••• {lastFour} foi salvo{"\n"}com sucesso.
              </Text>
              <Pressable style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Concluir</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  kavWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0d0d0d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  cardPreview: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: Colors.accent + "30",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  cardPreviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardChip: {
    width: 32,
    height: 24,
    borderRadius: 5,
    backgroundColor: Colors.accent + "30",
    borderWidth: 1,
    borderColor: Colors.accent + "50",
  },
  cardBandeiraText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 1,
  },
  cardNumPreview: {
    fontFamily: "DMMono_500Medium",
    fontSize: 16,
    color: "#fff",
    letterSpacing: 3,
  },
  cardPreviewBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardPreviewLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 8,
    color: "#555",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  cardPreviewValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
    color: "#ccc",
    letterSpacing: 1,
  },
  fieldLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "DMMono_400Regular",
    fontSize: 14,
    color: "#fff",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: Colors.accentGreen,
    borderRadius: 14,
    paddingVertical: 16,
  },
  addBtnDisabled: {
    backgroundColor: "#1a1a1a",
  },
  addBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#000",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 16,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentGreen + "15",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    color: "#fff",
  },
  successSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
  },
  doneBtn: {
    marginTop: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  doneBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#888",
  },
});
