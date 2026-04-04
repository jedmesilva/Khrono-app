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
  onRegenerate?: () => void;
};

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function PincodeSheet({ visible, pinCode, onClose, onRegenerate }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);
  const [copied, setCopied] = useState(false);
  const [currentPin, setCurrentPin] = useState(pinCode);

  useEffect(() => {
    setCurrentPin(pinCode);
  }, [pinCode]);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

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
    await Clipboard.setStringAsync(currentPin);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPin = generatePin();
    setCurrentPin(newPin);
    onRegenerate?.();
  };

  const digits = currentPin.split("");

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
          <View style={[styles.iconWrap, { backgroundColor: "#ff6b3512", borderColor: "#ff6b3525" }]}>
            <Feather name="hash" size={20} color="#ff6b35" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Meu PINCODE</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Compartilhe este código para ser contratado diretamente
          </Text>
        </View>

        <View style={[styles.pinCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.pinLabel, { color: colors.textMuted }]}>SEU PINCODE</Text>
          <View style={styles.digitsRow}>
            {digits.map((d, i) => (
              <View
                key={i}
                style={[styles.digitBox, { backgroundColor: colors.card, borderColor: "#ff6b3530" }]}
              >
                <Text style={styles.digitText}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.pinHint, { color: colors.textDim }]}>
            Válido enquanto você estiver disponível
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
            color={copied ? "#00e5a0" : colors.textSecondary}
          />
          <Text style={[styles.copyBtnText, { color: copied ? "#00e5a0" : colors.textSecondary }]}>
            {copied ? "Copiado!" : "Copiar código"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.regenBtn, pressed && { opacity: 0.8 }]}
          onPress={handleRegenerate}
        >
          <Feather name="refresh-cw" size={15} color="#fff" />
          <Text style={styles.regenBtnText}>Gerar novo PINCODE</Text>
        </Pressable>

        <Text style={[styles.regenWarning, { color: colors.textDim }]}>
          Ao gerar um novo código, o anterior deixa de funcionar
        </Text>
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
    marginBottom: 24,
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
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: 16,
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
    fontFamily: "DMMono_400Regular",
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
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 36,
    color: "#ff6b35",
    lineHeight: 42,
  },
  pinHint: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    letterSpacing: 0.2,
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
    backgroundColor: "#ff6b35",
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 12,
  },
  regenBtnText: {
    fontFamily: "Sora_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  regenWarning: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
});
