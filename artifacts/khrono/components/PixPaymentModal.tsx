import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { formatCurrency } from "@/lib/format";

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  providerName: string;
  amount: number;
  tipoContrato: "aberto" | "definido";
};

function buildPixKey(name: string) {
  const first = name.split(" ")[0].toLowerCase();
  return `${first}@khrono.app`;
}

export function PixPaymentModal({
  visible,
  onClose,
  onConfirm,
  providerName,
  amount,
  tipoContrato,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ref = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ["72%"], []);

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

  const [copied, setCopied] = useState(false);
  const pixKey = buildPixKey(providerName);
  const isAberto = tipoContrato === "aberto";
  const confirmedRef = useRef(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  async function handleCopy() {
    await Clipboard.setStringAsync(pixKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleConfirm() {
    confirmedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    ref.current?.dismiss();
    onConfirm();
  }

  function handleClose() {
    closingRef.current = true;
    ref.current?.dismiss();
    onClose();
  }

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBgStyle}
      handleIndicatorStyle={handleStyle}
      onDismiss={() => {
        if (!confirmedRef.current && !closingRef.current) {
          onClose();
        }
        confirmedRef.current = false;
        closingRef.current = false;
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Feather name="arrow-left" size={18} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.title}>Pagar via Pix</Text>
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

          <Text style={styles.providerName}>{providerName}</Text>

          <View style={styles.amountBox}>
            {isAberto ? (
              <>
                <Text style={styles.amountLabel}>VALOR/HORA</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(amount)}
                </Text>
                <Text style={styles.amountNote}>
                  Valor final calculado ao encerrar o contrato
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.amountLabel}>VALOR TOTAL</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(amount)}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.pixKeyBox}>
          <Text style={styles.pixKeyLabel}>CHAVE PIX COPIA E COLA</Text>
          <View style={styles.pixKeyRow}>
            <Text style={styles.pixKeyValue} numberOfLines={1}>
              {pixKey}
            </Text>
            <Pressable
              onPress={handleCopy}
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

        <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.confirmText}>Já realizei o pagamento</Text>
        </Pressable>

        <Pressable onPress={handleClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Pagar depois</Text>
        </Pressable>
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    title: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 16,
      color: colors.text,
    },
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
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      marginBottom: 10,
    },
    confirmText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: "#fff",
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
