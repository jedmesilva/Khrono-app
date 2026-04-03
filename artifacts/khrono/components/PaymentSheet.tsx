import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
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
import { useCards } from "@/context/CardsContext";

export type PaymentMethod = "cartao" | "pix" | "dinheiro";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialMethod: PaymentMethod | null;
  initialCardId: string | null;
  onConfirm: (method: PaymentMethod, cardId: string | null) => void;
};

const METHOD_CONFIG = {
  cartao: { icon: "credit-card" as const, label: "Cartão", sub: "Débito ou crédito", color: "#ff6b35" },
  pix:    { icon: "zap" as const,         label: "Pix",    sub: "QR Code ou copia e cola", color: "#00e5a0" },
  dinheiro: { icon: "dollar-sign" as const, label: "Dinheiro", sub: "Pague diretamente ao prestador", color: "#aaa" },
};

export function PaymentSheet({ visible, onClose, initialMethod, initialCardId, onConfirm }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { cards } = useCards();
  const [method, setMethod] = useState<PaymentMethod | null>(initialMethod);
  const [cardId, setCardId] = useState<string | null>(initialCardId);

  useEffect(() => {
    if (visible) {
      setMethod(initialMethod);
      const defaultCardId = initialCardId ?? cards.find(c => c.padrao)?.id ?? cards[0]?.id ?? null;
      setCardId(defaultCardId);
    }
  }, [visible]);

  function selectMethod(m: PaymentMethod) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMethod(m);
    if (m === "cartao" && !cardId && cards.length > 0) {
      setCardId(cards.find(c => c.padrao)?.id ?? cards[0].id);
    }
  }

  function handleConfirm() {
    if (!method) return;
    if (method === "cartao" && !cardId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(method, method === "cartao" ? cardId : null);
    onClose();
  }

  const canConfirm = method !== null && (method !== "cartao" || (cardId !== null && cards.length > 0));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Forma de pagamento</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={18} color="#555" />
          </Pressable>
        </View>

        {/* Cartão */}
        <Pressable
          onPress={() => selectMethod("cartao")}
          style={[styles.methodRow, method === "cartao" && styles.methodRowActive]}
        >
          <View style={[styles.methodIcon, method === "cartao" && { borderColor: "#ff6b3540", backgroundColor: "#ff6b3510" }]}>
            <Feather name="credit-card" size={18} color={method === "cartao" ? "#ff6b35" : "#444"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodLabel, method === "cartao" && { color: "#ff6b35" }]}>Cartão</Text>
            <Text style={styles.methodSub}>Débito ou crédito</Text>
          </View>
          <View style={[styles.radio, method === "cartao" && styles.radioActive]}>
            {method === "cartao" && <View style={styles.radioInner} />}
          </View>
        </Pressable>

        {/* Cards list */}
        {method === "cartao" && (
          <View style={styles.cardsList}>
            {cards.length === 0 ? (
              <View style={styles.noCardsBox}>
                <Feather name="alert-circle" size={14} color="#444" />
                <Text style={styles.noCardsText}>Nenhum cartão na wallet. Adicione um na aba Carteira.</Text>
              </View>
            ) : (
              cards.map(card => {
                const sel = cardId === card.id;
                const isVisa = card.bandeira === "Visa";
                const bandeiraColor = isVisa ? "#1a1f71" : "#eb001b";
                return (
                  <Pressable
                    key={card.id}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCardId(card.id); }}
                    style={[styles.cardRow, sel && styles.cardRowActive]}
                  >
                    <View style={[styles.cardBandeira, { borderColor: bandeiraColor + "40", backgroundColor: bandeiraColor + "12" }]}>
                      <Text style={[styles.cardBandeiraText, { color: bandeiraColor }]}>
                        {card.bandeira.slice(0, 4).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardNumber, sel && { color: "#fff" }]}>
                        •••• {card.numero}
                      </Text>
                      <Text style={styles.cardValidade}>Válido até {card.validade}</Text>
                    </View>
                    {card.padrao && (
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
          style={[styles.methodRow, method === "pix" && styles.methodRowPixActive]}
        >
          <View style={[styles.methodIcon, method === "pix" && { borderColor: "#00e5a040", backgroundColor: "#00e5a010" }]}>
            <Feather name="zap" size={18} color={method === "pix" ? "#00e5a0" : "#444"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodLabel, method === "pix" && { color: "#00e5a0" }]}>Pix</Text>
            <Text style={styles.methodSub}>QR Code ou copia e cola gerados na hora</Text>
          </View>
          <View style={[styles.radio, method === "pix" && styles.radioPixActive]}>
            {method === "pix" && <View style={styles.radioInnerGreen} />}
          </View>
        </Pressable>

        {/* Dinheiro */}
        <Pressable
          onPress={() => selectMethod("dinheiro")}
          style={[styles.methodRow, method === "dinheiro" && styles.methodRowDinheiroActive]}
        >
          <View style={[styles.methodIcon, method === "dinheiro" && { borderColor: "#ffffff20", backgroundColor: "#ffffff08" }]}>
            <Feather name="dollar-sign" size={18} color={method === "dinheiro" ? "#ccc" : "#444"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodLabel, method === "dinheiro" && { color: "#ccc" }]}>Dinheiro</Text>
            <Text style={styles.methodSub}>Pague em espécie diretamente ao prestador</Text>
          </View>
          <View style={[styles.radio, method === "dinheiro" && styles.radioDinheiroActive]}>
            {method === "dinheiro" && <View style={styles.radioInnerGray} />}
          </View>
        </Pressable>

        <Pressable
          onPress={canConfirm ? handleConfirm : undefined}
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
        >
          <Feather name="check" size={16} color={canConfirm ? "#000" : "#333"} />
          <Text style={[styles.confirmText, !canConfirm && { color: "#333" }]}>Confirmar método</Text>
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
    paddingHorizontal: 20,
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
    marginBottom: 16,
  },
  title: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 16,
    color: "#fff",
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
    borderColor: "#1a1a1a",
    backgroundColor: "#0a0a0a",
  },
  methodRowActive: {
    borderColor: "#ff6b3535",
    backgroundColor: "#ff6b3508",
  },
  methodRowPixActive: {
    borderColor: "#00e5a035",
    backgroundColor: "#00e5a008",
  },
  methodRowDinheiroActive: {
    borderColor: "#ffffff18",
    backgroundColor: "#ffffff05",
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  methodLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#888",
    marginBottom: 2,
  },
  methodSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: "#ff6b35",
  },
  radioPixActive: {
    borderColor: "#00e5a0",
  },
  radioDinheiroActive: {
    borderColor: "#666",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff6b35",
  },
  radioInnerGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00e5a0",
  },
  radioInnerGray: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#888",
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
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  noCardsText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    flex: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    backgroundColor: "#0a0a0a",
  },
  cardRowActive: {
    borderColor: "#ff6b3540",
    backgroundColor: "#ff6b3508",
  },
  cardBandeira: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  cardBandeiraText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 9,
    fontWeight: "700",
  },
  cardNumber: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  cardValidade: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
  },
  padraoTag: {
    backgroundColor: "#ff6b3515",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#ff6b3530",
  },
  padraoText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#ff6b35",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    backgroundColor: "#ff6b35",
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmBtnDisabled: {
    backgroundColor: "#1a1a1a",
  },
  confirmText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#000",
  },
});
