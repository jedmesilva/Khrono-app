import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "@/lib/haptics";
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

const STATUS_GREEN = "#18a06b";

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

  const snapPoints = useMemo(() => ["62%"], []);

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

  const handleStyle = useMemo(() => ({ height: 0, width: 0 }), []);

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
          <Text style={[styles.title, { color: colors.text }]}>Meu QR Code</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Peça ao contratante para escanear o código abaixo
          </Text>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Aguardando contratação</Text>
        </View>

        {/* QR */}
        <View style={styles.qrCenter}>
          {qrValue ? (
            <View style={styles.qrWrap}>
              <QRCode
                value={qrValue}
                size={200}
                color="#1a1a1a"
                backgroundColor="#ffffff"
                ecl="M"
              />
            </View>
          ) : (
            <View style={[styles.qrUnavailable, { borderColor: colors.surfaceBorder }]}>
              <Feather name="wifi-off" size={28} color={colors.textMuted} />
              <Text style={[styles.qrUnavailableText, { color: colors.textMuted }]}>
                QR Code disponível{"\n"}ao conectar com internet
              </Text>
            </View>
          )}
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
    paddingTop: 12,
    gap: 18,
  },
  header: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    letterSpacing: 0.1,
    textAlign: "center",
    lineHeight: 17,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STATUS_GREEN,
  },
  statusText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: STATUS_GREEN,
    letterSpacing: 0.2,
  },
  qrCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  qrWrap: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
  },
  qrUnavailable: {
    width: 200,
    height: 200,
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
    marginTop: -10,
  },
});
