import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
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

import { ColorPalette, useTheme } from "@/context/ThemeContext";

type KeyType = "cpf" | "email" | "phone" | "random";

const KEY_TYPES: { id: KeyType; label: string; placeholder: string }[] = [
  { id: "cpf", label: "CPF", placeholder: "000.000.000-00" },
  { id: "email", label: "E-mail", placeholder: "seu@email.com" },
  { id: "phone", label: "Celular", placeholder: "(11) 99999-9999" },
  { id: "random", label: "Aleatória", placeholder: "Chave aleatória" },
];

type Props = {
  visible: boolean;
  balance: number;
  onClose: () => void;
};

type Step = "form" | "confirm" | "success";

export function PixWithdrawModal({ visible, balance, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [keyType, setKeyType] = useState<KeyType>("cpf");
  const [pixKey, setPixKey] = useState("");

  const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;
  const isValid = parsedAmount > 0 && pixKey.trim().length > 3;

  function handleClose() {
    setStep("form");
    setAmount("");
    setPixKey("");
    setKeyType("cpf");
    onClose();
  }

  function handleConfirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("confirm");
  }

  function handlePay() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("success");
  }

  const placeholder = KEY_TYPES.find((k) => k.id === keyType)?.placeholder ?? "";

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
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <View style={styles.handle} />

          {step === "form" && (
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Sacar via Pix</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Feather name="x" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>VALOR</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencyPrefix}>R$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0,00"
                  placeholderTextColor={colors.textDim}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>

              <Text style={styles.balanceHint}>
                Saldo disponível: R$ {balance.toFixed(2)}
              </Text>

              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
                TIPO DE CHAVE
              </Text>
              <View style={styles.keyTypeRow}>
                {KEY_TYPES.map((k) => (
                  <Pressable
                    key={k.id}
                    style={[
                      styles.keyTypeBtn,
                      keyType === k.id && styles.keyTypeBtnActive,
                    ]}
                    onPress={() => setKeyType(k.id)}
                  >
                    <Text
                      style={[
                        styles.keyTypeTxt,
                        keyType === k.id && styles.keyTypeTxtActive,
                      ]}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                CHAVE PIX
              </Text>
              <TextInput
                style={styles.keyInput}
                value={pixKey}
                onChangeText={setPixKey}
                placeholder={placeholder}
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                keyboardType={
                  keyType === "phone" || keyType === "cpf"
                    ? "numeric"
                    : "default"
                }
              />

              <Pressable
                style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
                onPress={isValid ? handleConfirm : undefined}
              >
                <Text style={styles.confirmBtnText}>Continuar</Text>
                <Feather name="arrow-right" size={16} color="#000" />
              </Pressable>
            </>
          )}

          {step === "confirm" && (
            <>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setStep("form")} hitSlop={12}>
                  <Feather name="arrow-left" size={18} color={colors.textSecondary} />
                </Pressable>
                <Text style={styles.sheetTitle}>Confirmar saque</Text>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <Feather name="x" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.confirmCard}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>VALOR</Text>
                  <Text style={styles.confirmValue}>R$ {parsedAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>CHAVE PIX</Text>
                  <Text style={styles.confirmValue} numberOfLines={1}>
                    {pixKey}
                  </Text>
                </View>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>TIPO</Text>
                  <Text style={styles.confirmValue}>
                    {KEY_TYPES.find((k) => k.id === keyType)?.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.confirmNote}>
                O valor será transferido em até 10 segundos após a confirmação.
              </Text>

              <Pressable style={styles.confirmBtn} onPress={handlePay}>
                <Feather name="zap" size={16} color="#000" />
                <Text style={styles.confirmBtnText}>Confirmar Pix</Text>
              </Pressable>
            </>
          )}

          {step === "success" && (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Feather name="check" size={32} color={"#00e5a0"} />
              </View>
              <Text style={styles.successTitle}>Pix enviado!</Text>
              <Text style={styles.successSub}>
                R$ {parsedAmount.toFixed(2)} transferido para{"\n"}
                {pixKey}
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

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.7)",
    },
    kavWrapper: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: colors.sheetBorder,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: colors.handleColor,
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
      color: colors.text,
    },
    fieldLabel: {
      fontFamily: "DMMono_400Regular",
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    currencyPrefix: {
      fontFamily: "DMMono_500Medium",
      fontSize: 18,
      color: colors.textSecondary,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      fontFamily: "DMMono_500Medium",
      fontSize: 28,
      color: colors.text,
      paddingVertical: 16,
    },
    balanceHint: {
      fontFamily: "DMMono_400Regular",
      fontSize: 10,
      color: colors.textDim,
      marginTop: 6,
      marginLeft: 4,
    },
    keyTypeRow: {
      flexDirection: "row",
      gap: 8,
    },
    keyTypeBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    keyTypeBtnActive: {
      borderColor: "#00e5a0",
      backgroundColor: "#00e5a015",
    },
    keyTypeTxt: {
      fontFamily: "DMMono_400Regular",
      fontSize: 10,
      color: colors.textMuted,
    },
    keyTypeTxtActive: {
      color: "#00e5a0",
    },
    keyInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: "DMMono_400Regular",
      fontSize: 14,
      color: colors.text,
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
      backgroundColor: colors.cardBorder,
    },
    confirmBtnText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: "#000",
    },
    confirmCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 16,
      padding: 20,
      gap: 0,
    },
    confirmRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
    },
    confirmDivider: {
      height: 1,
      backgroundColor: colors.sheetBorder,
    },
    confirmLabel: {
      fontFamily: "DMMono_400Regular",
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1.5,
    },
    confirmValue: {
      fontFamily: "DMMono_500Medium",
      fontSize: 13,
      color: colors.text,
      maxWidth: 200,
      textAlign: "right",
    },
    confirmNote: {
      fontFamily: "DMMono_400Regular",
      fontSize: 10,
      color: colors.textDim,
      textAlign: "center",
      marginTop: 16,
      lineHeight: 16,
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
      color: colors.text,
    },
    successSub: {
      fontFamily: "DMMono_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    doneBtn: {
      marginTop: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 40,
    },
    doneBtnText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
}
