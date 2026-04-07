import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { addCard } = useCards();
  const ref = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ["90%"], []);

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

  useEffect(() => {
    if (visible) {
      ref.current?.present();
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
              <Text style={styles.sheetTitle}>Adicionar cartão</Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

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
                  <Text style={styles.cardPreviewValue}>{validade || "MM/AA"}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>NÚMERO DO CARTÃO</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={numero}
              onChangeText={(t) => setNumero(formatCardNumber(t))}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={colors.textDim}
              keyboardType="numeric"
              maxLength={19}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>NOME DO TITULAR</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={titular}
              onChangeText={setTitular}
              placeholder="Como aparece no cartão"
              placeholderTextColor={colors.textDim}
              autoCapitalize="words"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>VALIDADE</Text>
                <BottomSheetTextInput
                  style={styles.input}
                  value={validade}
                  onChangeText={(t) => setValidade(formatExpiry(t))}
                  placeholder="MM/AA"
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>CVV</Text>
                <BottomSheetTextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={(t) => setCvv(t.replace(/\D/g, "").slice(0, 3))}
                  placeholder="•••"
                  placeholderTextColor={colors.textDim}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            <Pressable
              style={[styles.addBtn, !isValid && styles.addBtnDisabled]}
              onPress={isValid ? handleAdd : undefined}
            >
              <Feather name="credit-card" size={16} color={isValid ? "#fff" : colors.textDim} />
              <Text style={[styles.addBtnText, !isValid && { color: colors.textDim }]}>
                Adicionar cartão
              </Text>
            </Pressable>
          </>
        )}

        {step === "success" && (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Feather name="check" size={32} color="#e06030" />
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
      marginBottom: 20,
    },
    sheetTitle: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 16,
      color: colors.text,
    },
    cardPreview: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: "#e0603030",
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
      backgroundColor: "#e0603030",
      borderWidth: 1,
      borderColor: "#e0603050",
    },
    cardBandeiraText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      color: "#e06030",
      letterSpacing: 1,
    },
    cardNumPreview: {
      fontFamily: "DMSans_500Medium",
      fontSize: 16,
      color: colors.text,
      letterSpacing: 3,
    },
    cardPreviewBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    cardPreviewLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 8,
      color: colors.textSecondary,
      letterSpacing: 1.5,
      marginBottom: 2,
    },
    cardPreviewValue: {
      fontFamily: "DMSans_500Medium",
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    fieldLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.text,
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
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
    },
    addBtnDisabled: {
      backgroundColor: colors.cardBorder,
    },
    addBtnText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: "#fff",
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
