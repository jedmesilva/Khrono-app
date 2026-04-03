import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

type Step = "form" | "qr" | "success";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const PIX_KEY = "khrono@app.com.br";

export function PixDepositModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;
  const isValid = parsedAmount > 0;

  function handleClose() {
    setStep("form");
    setAmount("");
    onClose();
  }

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("qr");
  }

  function handleDone() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("success");
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(PIX_KEY);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Depositar via Pix</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Feather name="x" size={18} color="#555" />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>VALOR A DEPOSITAR</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencyPrefix}>R$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0,00"
                  placeholderTextColor="#333"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>

              <Pressable
                style={[
                  styles.confirmBtn,
                  !isValid && styles.confirmBtnDisabled,
                ]}
                onPress={isValid ? handleContinue : undefined}
              >
                <Feather name="zap" size={16} color="#000" />
                <Text style={styles.confirmBtnText}>Gerar Pix</Text>
              </Pressable>
            </>
          )}

          {step === "qr" && (
            <>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setStep("form")} hitSlop={12}>
                  <Feather name="arrow-left" size={18} color="#555" />
                </Pressable>
                <Text style={styles.sheetTitle}>Pix gerado</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Feather name="x" size={18} color="#555" />
                </Pressable>
              </View>

              <View style={styles.qrBox}>
                <View style={styles.qrPlaceholder}>
                  <View style={styles.qrGrid}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.qrCell,
                          i % 2 === 0 && { backgroundColor: "#00e5a080" },
                        ]}
                      />
                    ))}
                  </View>
                  <Feather
                    name="zap"
                    size={28}
                    color={"#00e5a0"}
                    style={styles.qrIcon}
                  />
                </View>

                <Text style={styles.qrAmount}>
                  R$ {parsedAmount.toFixed(2).replace(".", ",")}
                </Text>
                <Text style={styles.qrSub}>
                  Escaneie com qualquer app de banco
                </Text>
              </View>

              <View style={styles.pixKeyBox}>
                <Text style={styles.pixKeyLabel}>CHAVE PIX COPIA E COLA</Text>
                <View style={styles.pixKeyRow}>
                  <Text style={styles.pixKeyValue} numberOfLines={1}>{PIX_KEY}</Text>
                  <Pressable
                    onPress={handleCopy}
                    hitSlop={8}
                    style={[styles.copyBtn, copied && styles.copyBtnCopied]}
                  >
                    <Feather
                      name={copied ? "check" : "copy"}
                      size={14}
                      color={copied ? "#00e5a0" : "#555"}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable style={styles.confirmBtn} onPress={handleDone}>
                <Feather name="check" size={16} color="#000" />
                <Text style={styles.confirmBtnText}>Já fiz o depósito</Text>
              </Pressable>
            </>
          )}

          {step === "success" && (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Feather name="check" size={32} color={"#00e5a0"} />
              </View>
              <Text style={styles.successTitle}>Depósito em análise</Text>
              <Text style={styles.successSub}>
                R$ {parsedAmount.toFixed(2).replace(".", ",")} será creditado
                {"\n"}em breve na sua carteira.
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
    marginBottom: 24,
  },
  sheetTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  fieldLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  currencyPrefix: {
    fontFamily: "DMMono_500Medium",
    fontSize: 18,
    color: "#555",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: "DMMono_500Medium",
    fontSize: 28,
    color: "#fff",
    paddingVertical: 16,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: "#00e5a0",
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmBtnDisabled: {
    backgroundColor: "#1a1a1a",
  },
  confirmBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#000",
  },
  qrBox: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#00e5a030",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  qrGrid: {
    width: 90,
    height: 90,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  qrCell: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#1e1e1e",
  },
  qrIcon: {
    position: "absolute",
  },
  qrAmount: {
    fontFamily: "DMMono_500Medium",
    fontSize: 24,
    color: "#fff",
    letterSpacing: 1,
  },
  qrSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
  },
  pixKeyBox: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    padding: 16,
    gap: 6,
    marginBottom: 4,
  },
  pixKeyLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
  },
  pixKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pixKeyValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    color: "#00e5a0",
    flex: 1,
  },
  copyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  copyBtnCopied: {
    borderColor: "#00e5a040",
    backgroundColor: "#00e5a015",
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
    backgroundColor: "#00e5a015",
    borderWidth: 1,
    borderColor: "#00e5a040",
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
