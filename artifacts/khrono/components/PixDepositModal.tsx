import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPalette, useTheme } from "@/context/ThemeContext";

type Step = "form" | "qr" | "success";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const PIX_KEY = "khrono@app.com.br";

export function PixDepositModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ref = useRef<BottomSheetModal>(null);
  const amountRef = useRef<any>(null);

  const snapPoints = useMemo(() => ["55%", "80%"], []);

  const sheetBgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: colors.sheetBorder,
    }),
    [colors]
  );

  const handleStyle = useMemo(
    () => ({ backgroundColor: colors.handleColor, width: 36, height: 4 }),
    [colors]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;
  const isValid = parsedAmount > 0;

  useEffect(() => {
    if (visible) {
      ref.current?.present();
      setTimeout(() => amountRef.current?.focus(), 500);
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      ref.current?.snapToIndex(0);
    });
    return () => sub.remove();
  }, []);

  function handleClose() {
    ref.current?.dismiss();
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
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBgStyle}
      handleIndicatorStyle={handleStyle}
      onDismiss={onClose}
      keyboardBehavior="extend"
      keyboardBlurBehavior="none"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === "form" && (
          <>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Depositar via Pix</Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>VALOR A DEPOSITAR</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <BottomSheetTextInput
                ref={amountRef}
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor={colors.textDim}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <Pressable
              style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
              onPress={isValid ? handleContinue : undefined}
            >
              <Feather name="zap" size={16} color="#fff" />
              <Text style={styles.confirmBtnText}>Gerar Pix</Text>
            </Pressable>
          </>
        )}

        {step === "qr" && (
          <>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setStep("form")} hitSlop={12}>
                <Feather name="arrow-left" size={18} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>Pix gerado</Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.qrBox}>
              <View style={styles.qrPlaceholder}>
                <View style={styles.qrGrid}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.qrCell, i % 2 === 0 && { backgroundColor: "#e0603080" }]}
                    />
                  ))}
                </View>
                <Feather name="zap" size={28} color="#e06030" style={styles.qrIcon} />
              </View>
              <Text style={styles.qrAmount}>
                R$ {parsedAmount.toFixed(2).replace(".", ",")}
              </Text>
              <Text style={styles.qrSub}>Escaneie com qualquer app de banco</Text>
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
                    color={copied ? "#e06030" : colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.confirmBtn} onPress={handleDone}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.confirmBtnText}>Já fiz o depósito</Text>
            </Pressable>
          </>
        )}

        {step === "success" && (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Feather name="check" size={32} color="#e06030" />
            </View>
            <Text style={styles.successTitle}>Depósito em análise</Text>
            <Text style={styles.successSub}>
              R$ {parsedAmount.toFixed(2).replace(".", ",")} será creditado{"\n"}em breve na sua carteira.
            </Text>
            <Pressable style={styles.doneBtn} onPress={handleClose}>
              <Text style={styles.doneBtnText}>Concluir</Text>
            </Pressable>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 24,
      paddingTop: 4,
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
      fontFamily: "DMSans_400Regular",
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
      marginBottom: 4,
    },
    currencyPrefix: {
      fontFamily: "DMSans_500Medium",
      fontSize: 18,
      color: colors.textSecondary,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      fontFamily: "DMSans_500Medium",
      fontSize: 28,
      color: colors.text,
      paddingVertical: 16,
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 20,
      backgroundColor: "#e06030",
      borderRadius: 14,
      paddingVertical: 16,
    },
    confirmBtnDisabled: {
      backgroundColor: colors.cardBorder,
    },
    confirmBtnText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: "#fff",
    },
    qrBox: {
      alignItems: "center",
      paddingVertical: 16,
      gap: 12,
    },
    qrPlaceholder: {
      width: 160,
      height: 160,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: "#e0603030",
      borderRadius: 24,
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
      backgroundColor: colors.surfaceBorder,
    },
    qrIcon: {
      position: "absolute",
    },
    qrAmount: {
      fontFamily: "DMSans_500Medium",
      fontSize: 24,
      color: colors.text,
      letterSpacing: 1,
    },
    qrSub: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textMuted,
    },
    pixKeyBox: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 16,
      gap: 6,
      marginBottom: 4,
    },
    pixKeyLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1.5,
    },
    pixKeyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    pixKeyValue: {
      fontFamily: "DMSans_500Medium",
      fontSize: 13,
      color: "#e06030",
      flex: 1,
    },
    copyBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.cardBorder,
      borderWidth: 1,
      borderColor: colors.handleColor,
      alignItems: "center",
      justifyContent: "center",
    },
    copyBtnCopied: {
      borderColor: "#e0603040",
      backgroundColor: "#e0603015",
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
      backgroundColor: "#e0603015",
      borderWidth: 1,
      borderColor: "#e0603040",
      alignItems: "center",
      justifyContent: "center",
    },
    successTitle: {
      fontFamily: "Sora_700Bold",
      fontSize: 22,
      color: colors.text,
    },
    successSub: {
      fontFamily: "DMSans_400Regular",
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
