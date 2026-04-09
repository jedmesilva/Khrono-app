import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { ColorPalette, useTheme } from "@/context/ThemeContext";

export type PaymentMethod = "cartao" | "pix" | "dinheiro";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialMethod: PaymentMethod | null;
  initialCardId: string | null;
  onConfirm: (method: PaymentMethod, cardId: string | null) => void;
};

export function PaymentSheet({
  visible,
  onClose,
  initialMethod,
  initialCardId,
  onConfirm,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cards } = useWallet();
  const ref = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ["60%", "85%"], []);

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

  const [method, setMethod] = useState<PaymentMethod | null>(initialMethod);
  const [cardId, setCardId] = useState<string | null>(initialCardId);

  useEffect(() => {
    if (visible) {
      setMethod(initialMethod);
      const defaultCardId =
        initialCardId ?? cards.find((c) => c.isDefault)?.id ?? cards[0]?.id ?? null;
      setCardId(defaultCardId);
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  function selectMethod(m: PaymentMethod) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMethod(m);
    if (m === "cartao" && !cardId && cards.length > 0) {
      setCardId(cards.find((c) => c.isDefault)?.id ?? cards[0].id);
    }
  }

  function handleConfirm() {
    if (!method) return;
    if (method === "cartao" && !cardId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(method, method === "cartao" ? cardId : null);
    ref.current?.dismiss();
    onClose();
  }

  const canConfirm =
    method !== null &&
    (method !== "cartao" || (cardId !== null && cards.length > 0));

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBgStyle}
      handleIndicatorStyle={handleStyle}
      onDismiss={onClose}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Forma de pagamento</Text>
          <Pressable onPress={() => { ref.current?.dismiss(); onClose(); }} hitSlop={12}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Cartão */}
        <Pressable
          onPress={() => selectMethod("cartao")}
          style={[styles.methodRow, method === "cartao" && styles.methodRowActive]}
        >
          <View style={[styles.methodIcon, method === "cartao" && styles.methodIconActive]}>
            <Feather
              name="credit-card"
              size={18}
              color={method === "cartao" ? colors.accent : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodLabel, method === "cartao" && styles.methodLabelActive]}>
              Cartão
            </Text>
            <Text style={styles.methodSub}>Débito ou crédito</Text>
          </View>
          <View style={[styles.radio, method === "cartao" && styles.radioActive]}>
            {method === "cartao" && <View style={styles.radioInner} />}
          </View>
        </Pressable>

        {/* Lista de cartões */}
        {method === "cartao" && (
          <View style={styles.cardsList}>
            {cards.length === 0 ? (
              <View style={styles.noCardsBox}>
                <Feather name="alert-circle" size={14} color={colors.textMuted} />
                <Text style={styles.noCardsText}>
                  Nenhum cartão na wallet. Adicione um na aba Carteira.
                </Text>
              </View>
            ) : (
              cards.map((card) => {
                const sel = cardId === card.id;
                const isVisa = card.bandeira === "Visa";
                const bandeiraColor = isVisa ? "#1a1f71" : "#eb001b";
                return (
                  <Pressable
                    key={card.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCardId(card.id);
                    }}
                    style={[styles.cardRow, sel && styles.cardRowActive]}
                  >
                    <View
                      style={[
                        styles.cardBandeira,
                        {
                          borderColor: bandeiraColor + "40",
                          backgroundColor: bandeiraColor + "12",
                        },
                      ]}
                    >
                      <Text style={[styles.cardBandeiraText, { color: bandeiraColor }]}>
                        {card.bandeira.slice(0, 4).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardNumber, sel && { color: colors.text }]}>
                        •••• {card.lastFour}
                      </Text>
                      <Text style={styles.cardValidade}>Válido até {card.validade}</Text>
                    </View>
                    {card.isDefault && (
                      <View style={styles.padraoTag}>
                        <Text style={styles.padraoText}>padrão</Text>
                      </View>
                    )}
                    <View style={[styles.radio, sel && styles.radioActive]}>
                      {sel && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* Pix */}
        <Pressable
          onPress={() => selectMethod("pix")}
          style={[styles.methodRow, method === "pix" && styles.methodRowActive]}
        >
          <View style={[styles.methodIcon, method === "pix" && styles.methodIconActive]}>
            <Feather
              name="zap"
              size={18}
              color={method === "pix" ? colors.accent : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodLabel, method === "pix" && styles.methodLabelActive]}>
              Pix
            </Text>
            <Text style={styles.methodSub}>QR Code ou copia e cola gerados na hora</Text>
          </View>
          <View style={[styles.radio, method === "pix" && styles.radioActive]}>
            {method === "pix" && <View style={styles.radioInner} />}
          </View>
        </Pressable>

        {/* Dinheiro */}
        <Pressable
          onPress={() => selectMethod("dinheiro")}
          style={[styles.methodRow, method === "dinheiro" && styles.methodRowActive]}
        >
          <View style={[styles.methodIcon, method === "dinheiro" && styles.methodIconActive]}>
            <Feather
              name="dollar-sign"
              size={18}
              color={method === "dinheiro" ? colors.accent : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.methodLabel, method === "dinheiro" && styles.methodLabelActive]}
            >
              Dinheiro
            </Text>
            <Text style={styles.methodSub}>Pague em espécie direto ao contratado</Text>
          </View>
          <View style={[styles.radio, method === "dinheiro" && styles.radioActive]}>
            {method === "dinheiro" && <View style={styles.radioInner} />}
          </View>
        </Pressable>

        <Pressable
          onPress={canConfirm ? handleConfirm : undefined}
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
        >
          <Feather name="check" size={16} color={canConfirm ? "#fff" : colors.textDim} />
          <Text style={[styles.confirmText, !canConfirm && { color: colors.textDim }]}>
            Confirmar método
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    title: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 16,
      color: colors.text,
    },
    methodRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.sheetBorder,
      backgroundColor: colors.card,
    },
    methodRowActive: {
      borderColor: colors.accent + "40",
    },
    methodIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    methodIconActive: {
      borderColor: colors.accent + "40",
    },
    methodLabel: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    methodLabelActive: {
      color: colors.accent,
    },
    methodSub: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: colors.textMuted,
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: colors.textDim,
      alignItems: "center",
      justifyContent: "center",
    },
    radioActive: {
      borderColor: colors.accent,
    },
    radioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    cardsList: {
      marginLeft: 12,
      marginRight: 4,
      marginBottom: 8,
      gap: 6,
    },
    noCardsBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    noCardsText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textMuted,
      flex: 1,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.card,
    },
    cardRowActive: {
      borderColor: colors.accent + "40",
    },
    cardBandeira: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    cardBandeiraText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 9,
      fontWeight: "700",
    },
    cardNumber: {
      fontFamily: "DMSans_500Medium",
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    cardValidade: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: colors.textDim,
    },
    padraoTag: {
      backgroundColor: colors.accent + "15",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: colors.accent + "30",
    },
    padraoText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 9,
      color: colors.accent,
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
    },
    confirmBtnDisabled: {
      backgroundColor: colors.cardBorder,
    },
    confirmText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: "#fff",
    },
  });
}
