import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { type QRPayload } from "@/context/AvailabilityContext";

type Props = {
  visible: boolean;
  qrPayload: QRPayload | null;
  onClose: () => void;
  onRegenerate: () => Promise<void>;
};

export function QRCodeSheet({ visible, qrPayload, onClose, onRegenerate }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  useEffect(() => {
    setConfirmRegen(false);
    setRegenerating(false);
  }, [qrPayload]);

  const snapPoints = useMemo(() => ["68%"], []);

  const sheetBgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
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
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.75}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleRegenPress = () => {
    if (!confirmRegen) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setConfirmRegen(true);
      setTimeout(() => setConfirmRegen(false), 4000);
      return;
    }
    handleConfirmRegen();
  };

  const handleConfirmRegen = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setRegenerating(true);
    setConfirmRegen(false);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  const qrValue = qrPayload ? JSON.stringify(qrPayload) : null;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBgStyle}
      handleIndicatorStyle={handleStyle}
      onDismiss={onClose}
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 28) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "25" }]}>
            <Feather name="maximize" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>QR Code</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Peça ao contratante para escanear o código abaixo
          </Text>
        </View>

        {/* Status */}
        <View style={[styles.statusRow, { backgroundColor: "#18a06b10", borderColor: "#18a06b25" }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Aguardando contratação</Text>
        </View>

        {/* QR Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>QR CODE</Text>

          {qrValue ? (
            <View style={[styles.qrWrap, { backgroundColor: "#ffffff" }]}>
              <QRCode
                value={qrValue}
                size={190}
                color="#1a1a1a"
                backgroundColor="#ffffff"
                ecl="M"
              />
            </View>
          ) : (
            <View style={[styles.qrUnavailable, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Feather name="wifi-off" size={28} color={colors.textMuted} />
              <Text style={[styles.qrUnavailableText, { color: colors.textMuted }]}>
                QR Code disponível{"\n"}ao conectar com internet
              </Text>
            </View>
          )}

          <Text style={[styles.cardHint, { color: colors.textDim }]}>
            Válido para uma única contratação nesta sessão
          </Text>
        </View>

        {/* Regenerate button */}
        <Pressable
          style={({ pressed }) => [
            styles.regenBtn,
            { borderColor: confirmRegen ? colors.accent : colors.surfaceBorder },
            confirmRegen && { backgroundColor: colors.accent + "10" },
            (pressed || regenerating) && { opacity: 0.7 },
          ]}
          onPress={handleRegenPress}
          disabled={regenerating}
        >
          {regenerating ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Feather
              name="refresh-cw"
              size={14}
              color={confirmRegen ? colors.accent : colors.textMuted}
            />
          )}
          <Text style={[styles.regenBtnText, { color: confirmRegen ? colors.accent : colors.textMuted }]}>
            {regenerating
              ? "Gerando novo QR Code..."
              : confirmRegen
              ? "Toque novamente para confirmar"
              : "Gerar novo QR Code"}
          </Text>
        </Pressable>

        {confirmRegen && (
          <Text style={[styles.regenWarning, { color: colors.textDim }]}>
            O QR Code e o PINCODE atuais serão invalidados.
          </Text>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#18a06b",
  },
  statusText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#18a06b",
    letterSpacing: 0.3,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 16,
  },
  cardLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  qrWrap: {
    borderRadius: 16,
    padding: 16,
  },
  qrUnavailable: {
    width: 190,
    height: 190,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  qrUnavailableText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  cardHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  regenBtnText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    letterSpacing: 0.1,
  },
  regenWarning: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    letterSpacing: 0.1,
    paddingHorizontal: 8,
    marginTop: -4,
  },
});
