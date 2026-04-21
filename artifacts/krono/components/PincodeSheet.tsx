import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
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

const STATUS_GREEN = "#18a06b";

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

  useEffect(() => {
    setConfirmRegen(false);
    setRegenerating(false);
    setCopied(false);
  }, [pinCode]);

  const snapPoints = useMemo(() => ["56%"], []);

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

  const handleCopy = async () => {
    await Clipboard.setStringAsync(pinCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const digits = pinCode.split("");

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
          <Text style={[styles.title, { color: colors.text }]}>Meu PINCODE</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Informe-o ao contratante para ser contratado
          </Text>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Aguardando contratação</Text>
        </View>

        {/* Digits */}
        <View style={styles.digitsRow}>
          {digits.map((d, i) => (
            <View
              key={i}
              style={[styles.digitBox, { borderColor: colors.surfaceBorder }]}
            >
              <Text style={[styles.digitText, { color: colors.accent }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Copy button */}
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: copied ? STATUS_GREEN + "10" : colors.accent + "10",
              borderColor: copied ? STATUS_GREEN + "30" : colors.accent + "30",
            },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleCopy}
        >
          <Feather
            name={copied ? "check" : "copy"}
            size={15}
            color={copied ? STATUS_GREEN : colors.accent}
          />
          <Text style={[styles.actionBtnText, { color: copied ? STATUS_GREEN : colors.accent }]}>
            {copied ? "Copiado!" : "Copiar código"}
          </Text>
        </Pressable>

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
  digitsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    paddingVertical: 4,
  },
  digitBox: {
    width: 58,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 36,
    lineHeight: 42,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionBtnText: {
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
