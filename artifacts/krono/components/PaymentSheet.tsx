import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useWallet } from "@/context/WalletContext";
import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { formatCurrency } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PaymentMethod = "cartao" | "pix" | "dinheiro" | "saldo";

type Step = "select" | "pix";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialMethod: PaymentMethod | null;
  initialCardId: string | null;
  /**
   * Called when the user confirms a non-pix method, OR after confirming pix payment
   * in the QR step (if showPixStep = true).
   */
  onConfirm: (method: PaymentMethod, cardId: string | null) => void;
  /**
   * When true, selecting Pix advances to a QR code / copia e cola step inside
   * the same sheet before calling onConfirm. Default: false (just selects).
   */
  showPixStep?: boolean;
  /** Recipient name — shown in Pix step */
  recipientName?: string;
  /** Amount — shown in Pix step */
  amount?: number;
  /** Contract type — affects copy in Pix step */
  contractType?: "aberto" | "definido";
  /** Hide saldo option entirely */
  hideSaldo?: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildPixKey(name: string) {
  const first = (name ?? "pagamento").split(" ")[0].toLowerCase();
  return `${first}@krono.app`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PaymentSheet({
  visible,
  onClose,
  initialMethod,
  initialCardId,
  onConfirm,
  showPixStep = false,
  recipientName = "Prestador",
  amount = 0,
  contractType = "definido",
  hideSaldo = false,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { cards, balance: walletBalance } = useWallet();
  const ref = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ["60%", "92%"], []);

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
    () => ({ height: 0, width: 0 }),
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

  const [step, setStep] = useState<Step>("select");
  const [method, setMethod] = useState<PaymentMethod | null>(initialMethod);
  const [cardId, setCardId] = useState<string | null>(initialCardId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep("select");
      setMethod(initialMethod);
      setCopied(false);
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

  function handleConfirmSelection() {
    if (!method) return;
    if (method === "cartao" && !cardId) return;
    if (method === "pix" && showPixStep) {
      setStep("pix");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(method, method === "cartao" ? cardId : null);
    ref.current?.dismiss();
    onClose();
  }

  async function handleCopyPix() {
    const key = buildPixKey(recipientName);
    await Clipboard.setStringAsync(key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleConfirmPix() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm("pix", null);
    ref.current?.dismiss();
    onClose();
  }

  const canConfirm =
    method !== null &&
    (method !== "cartao" || (cardId !== null && cards.length > 0)) &&
    (method !== "saldo" || walletBalance >= amount);

  const isAberto = contractType === "aberto";
  const pixKey = buildPixKey(recipientName);

  // ── Step: select ──────────────────────────────────────────────────────────────

  function renderSelect() {
    return (
      <>
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
            <Text style={styles.methodSub}>
              {showPixStep
                ? "QR Code e copia e cola gerados na hora"
                : "Transferência instantânea"}
            </Text>
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

        {/* Saldo Krono */}
        {!hideSaldo && (() => {
          const insufficient = walletBalance < amount;
          return (
            <Pressable
              onPress={!insufficient ? () => selectMethod("saldo") : undefined}
              style={[
                styles.methodRow,
                method === "saldo" && styles.methodRowActive,
                insufficient && styles.methodRowDisabled,
              ]}
            >
              <View style={[styles.methodIcon, method === "saldo" && styles.methodIconActive]}>
                <Feather
                  name="layers"
                  size={18}
                  color={
                    insufficient
                      ? colors.textDim
                      : method === "saldo"
                      ? colors.accent
                      : colors.textMuted
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.methodLabel,
                    method === "saldo" && styles.methodLabelActive,
                    insufficient && { color: colors.textDim },
                  ]}
                >
                  Saldo Krono
                </Text>
                <Text style={[styles.methodSub, insufficient && { color: colors.textDim }]}>
                  {insufficient
                    ? `Saldo insuficiente (${formatCurrency(walletBalance)} disponível)`
                    : `${formatCurrency(walletBalance)} disponível`}
                </Text>
              </View>
              <View style={[styles.radio, method === "saldo" && styles.radioActive]}>
                {method === "saldo" && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          );
        })()}

        <Pressable
          onPress={canConfirm ? handleConfirmSelection : undefined}
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
        >
          <Feather name={method === "pix" && showPixStep ? "zap" : "check"} size={16} color={canConfirm ? "#fff" : colors.textDim} />
          <Text style={[styles.confirmText, !canConfirm && { color: colors.textDim }]}>
            {method === "pix" && showPixStep ? "Gerar Pix" : "Confirmar método"}
          </Text>
        </Pressable>
      </>
    );
  }

  // ── Step: pix ─────────────────────────────────────────────────────────────────

  function renderPix() {
    return (
      <>
        <View style={styles.header}>
          <Pressable onPress={() => setStep("select")} hitSlop={12}>
            <Feather name="arrow-left" size={18} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.title}>Pagar via Pix</Text>
          <Pressable onPress={() => { ref.current?.dismiss(); onClose(); }} hitSlop={12}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* QR placeholder */}
        <View style={styles.qrBox}>
          <View style={styles.qrPlaceholder}>
            <View style={styles.qrGrid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.qrCell, i % 2 === 0 && styles.qrCellFilled]}
                />
              ))}
            </View>
            <Feather
              name="zap"
              size={26}
              color={colors.textSecondary}
              style={styles.qrIcon}
            />
          </View>

          <Text style={styles.providerName}>{recipientName}</Text>

          <View style={styles.amountBox}>
            {isAberto ? (
              <>
                <Text style={styles.amountLabel}>VALOR/HORA</Text>
                <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
                <Text style={styles.amountNote}>
                  Valor final calculado ao encerrar o contrato
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.amountLabel}>VALOR TOTAL</Text>
                <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
              </>
            )}
          </View>
        </View>

        {/* Copia e cola */}
        <View style={styles.pixKeyBox}>
          <Text style={styles.pixKeyLabel}>CHAVE PIX COPIA E COLA</Text>
          <View style={styles.pixKeyRow}>
            <Text style={styles.pixKeyValue} numberOfLines={1}>
              {pixKey}
            </Text>
            <Pressable
              onPress={handleCopyPix}
              hitSlop={8}
              style={[styles.copyBtn, copied && styles.copyBtnCopied]}
            >
              <Feather
                name={copied ? "check" : "copy"}
                size={14}
                color={copied ? colors.accent : colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={handleConfirmPix} style={styles.confirmBtn}>
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.confirmText}>Já realizei o pagamento</Text>
        </Pressable>

        <Pressable
          onPress={() => { ref.current?.dismiss(); onClose(); }}
          style={styles.cancelBtn}
        >
          <Text style={styles.cancelText}>Pagar depois</Text>
        </Pressable>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBgStyle}
      handleIndicatorStyle={handleStyle}
      onDismiss={onClose}
      enableDynamicSizing={false}
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === "select" ? renderSelect() : renderPix()}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

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
    // ── Method rows ──
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
      backgroundColor: colors.accent + "06",
    },
    methodRowDisabled: {
      opacity: 0.45,
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
      backgroundColor: colors.accent + "10",
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
    // ── Card list ──
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
    // ── Confirm button ──
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      marginBottom: 4,
    },
    confirmBtnDisabled: {
      backgroundColor: colors.cardBorder,
    },
    confirmText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: "#fff",
    },
    // ── Pix step ──
    qrBox: {
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
    },
    qrPlaceholder: {
      width: 148,
      height: 148,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    qrGrid: {
      width: 84,
      height: 84,
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
    qrCellFilled: {
      backgroundColor: colors.textDim,
    },
    qrIcon: {
      position: "absolute",
    },
    providerName: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: colors.text,
    },
    amountBox: {
      alignItems: "center",
      gap: 2,
    },
    amountLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 9,
      color: colors.textMuted,
      letterSpacing: 1.5,
    },
    amountValue: {
      fontFamily: "DMSans_500Medium",
      fontSize: 26,
      color: colors.text,
      letterSpacing: 1,
    },
    amountNote: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: colors.textDim,
      textAlign: "center",
      marginTop: 2,
    },
    pixKeyBox: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 14,
      padding: 16,
      gap: 6,
      marginBottom: 16,
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
      color: colors.textSecondary,
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
      borderColor: colors.accent + "40",
      backgroundColor: colors.accent + "15",
    },
    cancelBtn: {
      alignItems: "center",
      paddingVertical: 12,
    },
    cancelText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
