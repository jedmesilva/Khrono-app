import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

type Props = {
  visible: boolean;
  pinCode: string;
  onClose: () => void;
  onRegenerate: () => Promise<void>;
};

export function PincodeSheet({ visible, pinCode, onClose, onRegenerate }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  // Reset confirm state when pin changes (new pin generated)
  useEffect(() => {
    setConfirmRegen(false);
    setRegenerating(false);
  }, [pinCode]);

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

  const handleCopy = async () => {
    await Clipboard.setStringAsync(pinCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenPress = () => {
    if (!confirmRegen) {
      // First tap — ask confirmation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setConfirmRegen(true);
      // Auto-cancel confirm after 4s
      setTimeout(() => setConfirmRegen(false), 4000);
      return;
    }
    // Second tap — confirm, execute
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

  const digits = pinCode.split("");

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBgStyle}
      handleIndicatorStyle={handleStyle}
      onDismiss={onClose}
    >
      <BottomSheetView style={[styles.container, { paddingBottom: Math.max(insets.bottom, 28) }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: "#e0603012", borderColor: "#e0603025" }]}>
            <Feather name="hash" size={20} color="#e06030" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Meu PINCODE</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Válido para uma única contratação nesta sessão
          </Text>
        </View>

        <View style={[styles.statusRow, { backgroundColor: "#18a06b10", borderColor: "#18a06b25" }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Aguardando contratação</Text>
        </View>

        <View style={[styles.pinCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.pinLabel, { color: colors.textMuted }]}>SEU PINCODE</Text>
          <View style={styles.digitsRow}>
            {digits.map((d, i) => (
              <View
                key={i}
                style={[styles.digitBox, { backgroundColor: colors.card, borderColor: "#e0603030" }]}
              >
                <Text style={styles.digitText}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.pinHint, { color: colors.textDim }]}>
            Este código expira após a primeira contratação
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.copyBtn,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleCopy}
        >
          <Feather
            name={copied ? "check" : "copy"}
            size={15}
            color={copied ? "#18a06b" : colors.textSecondary}
          />
          <Text style={[styles.copyBtnText, { color: copied ? "#18a06b" : colors.textSecondary }]}>
            {copied ? "Copiado!" : "Copiar código"}
          </Text>
        </Pressable>

        {/* Regenerate button */}
        <Pressable
          style={({ pressed }) => [
            styles.regenBtn,
            confirmRegen && { borderColor: "#e06030", backgroundColor: "#e0603010" },
            (pressed || regenerating) && { opacity: 0.7 },
          ]}
          onPress={handleRegenPress}
          disabled={regenerating}
        >
          {regenerating ? (
            <ActivityIndicator size="small" color="#e06030" />
          ) : (
            <Feather
              name="refresh-cw"
              size={14}
              color={confirmRegen ? "#e06030" : colors.textMuted}
            />
          )}
          <Text
            style={[
              styles.regenBtnText,
              { color: confirmRegen ? "#e06030" : colors.textMuted },
            ]}
          >
            {regenerating
              ? "Gerando novo código..."
              : confirmRegen
              ? "Toque novamente para confirmar"
              : "Gerar novo PINCODE"}
          </Text>
        </Pressable>

        {confirmRegen && (
          <Text style={[styles.regenWarning, { color: colors.textDim }]}>
            O código atual será invalidado e não poderá mais ser usado.
          </Text>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
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
    marginBottom: 16,
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
  pinCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 12,
    gap: 16,
  },
  pinLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  digitsRow: {
    flexDirection: "row",
    gap: 12,
  },
  digitBox: {
    width: 58,
    height: 72,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 36,
    color: "#e06030",
    lineHeight: 42,
  },
  pinHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  copyBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
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
    borderColor: "#88888830",
    backgroundColor: "transparent",
    marginBottom: 8,
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
  },
});
