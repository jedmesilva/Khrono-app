import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { ProviderService } from "@/context/ConfirmationContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  services: ProviderService[];
  valorBase: number;
  selectedId: number | null;
  onSelect: (service: ProviderService) => void;
};

export function ServiceSelectionSheet({
  visible,
  onClose,
  services,
  valorBase,
  selectedId,
  onSelect,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  function handleSelect(service: ProviderService) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(service);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Selecionar service</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
        >
          {services.map((s) => {
            const ativo = s.id === selectedId;
            const valor = (valorBase * s.multiplicador).toFixed(0);
            return (
              <Pressable
                key={s.id}
                onPress={() => handleSelect(s)}
                style={[styles.serviceRow, ativo && styles.serviceRowActive]}
              >
                <View style={[styles.radio, ativo && styles.radioActive]}>
                  {ativo && <View style={styles.radioInner} />}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceName, ativo && { color: colors.text }]}>{s.nome}</Text>

                  <View style={styles.metaRow}>
                    <Feather name="star" size={10} color={"#ff6b35"} />
                    <Text style={styles.metaText}>{s.nota} · {s.avaliacoes} avaliações</Text>
                  </View>

                  {s.skill && (
                    <View style={styles.metaRow}>
                      <Feather name="tool" size={9} color={"#ff6b3588"} />
                      <Text style={[styles.metaText, { color: "#ff6b3588" }]}>{s.skill}</Text>
                    </View>
                  )}

                  {s.tools && s.tools.length > 0 && (
                    <View style={styles.metaRow}>
                      <Feather name="key" size={9} color={"#00e5a088"} />
                      <Text
                        style={[styles.metaText, { color: "#00e5a088" }]}
                        numberOfLines={1}
                      >
                        {s.tools.join(", ")}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.serviceRate, ativo && { color: "#ff6b35" }]}>
                  R${valor}/h
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
    },
    sheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingTop: 12,
      paddingHorizontal: 20,
      maxHeight: "80%",
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.handleColor,
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
      fontFamily: "Sora_700Bold",
      fontSize: 16,
      color: colors.text,
    },
    list: {
      flexGrow: 0,
    },
    serviceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 16,
      padding: 16,
    },
    serviceRowActive: {
      backgroundColor: "#ff6b3508",
      borderColor: "#ff6b3530",
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.textDim,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    radioActive: {
      borderColor: "#ff6b35",
    },
    radioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#ff6b35",
    },
    serviceName: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 3,
    },
    metaText: {
      fontFamily: "DMMono_400Regular",
      fontSize: 10,
      color: colors.textSecondary,
    },
    serviceRate: {
      fontFamily: "DMMono_500Medium",
      fontSize: 14,
      color: colors.textSecondary,
      flexShrink: 0,
    },
  });
}
