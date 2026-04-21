import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { CardField, CardFieldInput } from "@stripe/stripe-react-native";
import * as Haptics from "@/lib/haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { type CardBandeira, useWallet } from "@/context/WalletContext";
import { createStripeSetupIntent } from "@/lib/stripeApi";
import { useStripeSetupCard } from "@/lib/stripePaymentSheet";
import { supabase } from "@/lib/supabase";

type Step = "form" | "saving" | "success" | "error";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function stripeBrandToLocal(brand: string): CardBandeira {
  switch (brand.toLowerCase()) {
    case "visa":       return "Visa";
    case "mastercard": return "Mastercard";
    case "amex":       return "Amex";
    case "elo":        return "Elo";
    default:           return "Mastercard";
  }
}

function formatExpiry(month: number | undefined, year: number | undefined): string {
  if (!month || !year) return "";
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

export function AddCardModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { addCard } = useWallet();
  const { saveCard, loading: saving } = useStripeSetupCard();
  const ref = useRef<BottomSheetModal>(null);

  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const stripeReady = stripeKey.startsWith("pk_");

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

  const handleStyle = useMemo(() => ({ height: 0, width: 0 }), []);

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
  const [titular, setTitular] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stripe CardField state
  const [cardComplete, setCardComplete] = useState(false);
  const [cardDetails, setCardDetails] = useState<{
    brand: string;
    last4: string;
    expiryMonth?: number;
    expiryYear?: number;
  }>({ brand: "unknown", last4: "" });

  const previewBandeira = stripeBrandToLocal(cardDetails.brand);
  const previewLast4 = cardDetails.last4 || "••••";
  const previewValidade = formatExpiry(cardDetails.expiryMonth, cardDetails.expiryYear) || "MM/AA";

  const isValid = titular.trim().length > 1 && cardComplete;

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

  function resetForm() {
    setStep("form");
    setTitular("");
    setCardComplete(false);
    setCardDetails({ brand: "unknown", last4: "" });
    setErrorMsg(null);
  }

  function handleClose() {
    ref.current?.dismiss();
    resetForm();
    onClose();
  }

  async function handleAdd() {
    if (!stripeReady) {
      setErrorMsg(
        "Pagamentos por cartão não estão configurados neste build. Adicione EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY nas variáveis de ambiente do EAS e gere um novo build."
      );
      setStep("error");
      return;
    }
    if (!isValid || saving) return;
    Keyboard.dismiss();
    setStep("saving");
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { clientSecret } = await createStripeSetupIntent({
        customerEmail: user?.email,
        customerName: titular.trim(),
        payerProfileId: user?.id,
      });

      const result = await saveCard(clientSecret, titular.trim());

      if (!result.success) {
        setErrorMsg(result.error);
        setStep("error");
        return;
      }

      await addCard(
        {
          bandeira: previewBandeira,
          lastFour: cardDetails.last4 || "0000",
          titular: titular.trim(),
          validade: previewValidade,
        },
        result.paymentMethodId
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Não foi possível salvar o cartão.");
      setStep("error");
    }
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
        {/* ── FORM step ─────────────────────────────────────────────── */}
        {(step === "form" || step === "saving" || step === "error") && (
          <>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Adicionar cartão</Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Feather name="x" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Card preview */}
            <View style={styles.cardPreview}>
              <View style={styles.cardPreviewTop}>
                <View style={styles.cardChip} />
                <Text style={styles.cardBandeiraText}>{previewBandeira}</Text>
              </View>
              <Text style={styles.cardNumPreview}>
                •••• •••• •••• {previewLast4}
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
                  <Text style={styles.cardPreviewValue}>{previewValidade}</Text>
                </View>
              </View>
            </View>

            {/* Cardholder name */}
            <Text style={styles.fieldLabel}>NOME DO TITULAR</Text>
            <BottomSheetTextInput
              key="titular-input"
              style={styles.input}
              defaultValue={titular}
              onChangeText={setTitular}
              placeholder="Como aparece no cartão"
              placeholderTextColor={colors.textDim}
              autoCapitalize="words"
              autoCorrect={false}
              editable={step === "form"}
            />

            {/* Stripe secure card field */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>DADOS DO CARTÃO</Text>
            {stripeReady ? (
              <CardField
                postalCodeEnabled={false}
                style={styles.cardField}
                cardStyle={{
                  backgroundColor: colors.surface as string,
                  textColor: colors.text as string,
                  placeholderColor: colors.textDim as string,
                  borderColor: colors.surfaceBorder as string,
                  borderRadius: 12,
                  borderWidth: 1,
                  fontSize: 14,
                  cursorColor: "#e06030",
                }}
                onCardChange={(details: CardFieldInput.Details) => {
                  setCardComplete(details.complete);
                  setCardDetails({
                    brand: details.brand ?? "unknown",
                    last4: details.last4 ?? "",
                    expiryMonth: details.expiryMonth,
                    expiryYear: details.expiryYear,
                  });
                }}
              />
            ) : (
              <View style={[styles.errorBox, { marginTop: 0 }]}>
                <Feather name="alert-triangle" size={14} color="#e05050" />
                <Text style={styles.errorText}>
                  O Stripe não está configurado neste build. Defina{" "}
                  <Text style={{ fontFamily: "DMSans_500Medium" }}>
                    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  </Text>{" "}
                  nas variáveis de ambiente do EAS (expo.dev) e gere um novo build para habilitar o cadastro de cartões.
                </Text>
              </View>
            )}

            <Text style={styles.secureNote}>
              <Feather name="lock" size={11} color={colors.textMuted} /> Os dados do cartão são criptografados pelo Stripe e nunca passam pelos nossos servidores.
            </Text>

            {step === "error" && errorMsg && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#e05050" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Pressable
              style={[styles.addBtn, (!isValid || saving) && styles.addBtnDisabled]}
              onPress={isValid && !saving ? handleAdd : undefined}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="credit-card" size={16} color={isValid ? "#fff" : colors.textDim} />
                  <Text style={[styles.addBtnText, !isValid && { color: colors.textDim }]}>
                    {step === "error" ? "Tentar novamente" : "Salvar cartão"}
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}

        {/* ── SUCCESS step ──────────────────────────────────────────── */}
        {step === "success" && (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Feather name="check" size={32} color="#e06030" />
            </View>
            <Text style={styles.successTitle}>Cartão salvo!</Text>
            <Text style={styles.successSub}>
              {previewBandeira} •••• {cardDetails.last4 || "••••"} foi salvo{"\n"}
              com segurança para pagamentos futuros.
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
    cardField: {
      width: "100%",
      height: 52,
      borderRadius: 12,
      overflow: "hidden",
    },
    secureNote: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 10,
      marginBottom: 4,
      lineHeight: 16,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: "#e0505010",
      borderWidth: 1,
      borderColor: "#e0505030",
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    errorText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: "#e05050",
      flex: 1,
      lineHeight: 18,
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
