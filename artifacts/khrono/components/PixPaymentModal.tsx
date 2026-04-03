import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

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

export function PixPaymentModal({ visible, onClose, onConfirm, providerName, amount, tipoContrato }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const pixKey = buildPixKey(providerName);
  const isAberto = tipoContrato === "aberto";

  async function handleCopy() {
    await Clipboard.setStringAsync(pixKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleConfirm() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="arrow-left" size={18} color="#555" />
          </Pressable>
          <Text style={styles.title}>Pagar via Pix</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={18} color="#555" />
          </Pressable>
        </View>

        {/* QR Code placeholder */}
        <View style={styles.qrBox}>
          <View style={styles.qrPlaceholder}>
            <View style={styles.qrGrid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.qrCell,
                    i % 2 === 0 && { backgroundColor: "#00e5a080" },
                  ]}
                />
              ))}
            </View>
            <Feather name="zap" size={26} color={"#00e5a0"} style={styles.qrIcon} />
          </View>

          <Text style={styles.providerName}>{providerName}</Text>

          <View style={styles.amountBox}>
            {isAberto ? (
              <>
                <Text style={styles.amountLabel}>VALOR/HORA</Text>
                <Text style={styles.amountValue}>R$ {amount.toFixed(2).replace(".", ",")}</Text>
                <Text style={styles.amountNote}>Valor final calculado ao encerrar o contrato</Text>
              </>
            ) : (
              <>
                <Text style={styles.amountLabel}>VALOR TOTAL</Text>
                <Text style={styles.amountValue}>R$ {amount.toFixed(2).replace(".", ",")}</Text>
              </>
            )}
          </View>
        </View>

        {/* Pix key */}
        <View style={styles.pixKeyBox}>
          <Text style={styles.pixKeyLabel}>CHAVE PIX COPIA E COLA</Text>
          <View style={styles.pixKeyRow}>
            <Text style={styles.pixKeyValue} numberOfLines={1}>{pixKey}</Text>
            <Pressable
              onPress={handleCopy}
              hitSlop={8}
              style={[styles.copyBtn, copied && styles.copyBtnCopied]}
            >
              <Feather
                name={copied ? "check" : "copy"}
                size={14}
                color={copied ? "#00e5a0" : "#555"}
              />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
          <Feather name="check" size={16} color="#000" />
          <Text style={styles.confirmText}>Já realizei o pagamento</Text>
        </Pressable>

        <Pressable onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Pagar depois</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0d0d0d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
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
    color: "#fff",
  },
  qrBox: {
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  qrPlaceholder: {
    width: 148,
    height: 148,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#00e5a030",
    borderRadius: 16,
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
    backgroundColor: "#1e1e1e",
  },
  qrIcon: {
    position: "absolute",
  },
  providerName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  amountBox: {
    alignItems: "center",
    gap: 2,
  },
  amountLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
  },
  amountValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 26,
    color: "#00e5a0",
    letterSpacing: 1,
  },
  amountNote: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    textAlign: "center",
    marginTop: 2,
  },
  pixKeyBox: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    padding: 16,
    gap: 6,
    marginBottom: 16,
  },
  pixKeyLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
  },
  pixKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pixKeyValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    color: "#00e5a0",
    flex: 1,
  },
  copyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  copyBtnCopied: {
    borderColor: "#00e5a040",
    backgroundColor: "#00e5a015",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00e5a0",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
  },
  confirmText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#000",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#444",
  },
});
