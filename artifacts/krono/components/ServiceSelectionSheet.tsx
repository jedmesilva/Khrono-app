import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "@/lib/haptics";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { ProviderService } from "@/context/ConfirmationContext";
import { formatRate } from "@/lib/format";

type Props = {
  visible: boolean;
  onClose: () => void;
  services: ProviderService[];
  selectedId: number | null;
  onSelect: (service: ProviderService) => void;
};

export function ServiceSelectionSheet({
  visible,
  onClose,
  services,
  selectedId,
  onSelect,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ref = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ["50%", "80%"], []);

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

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  function handleSelect(service: ProviderService) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(service);
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
      onDismiss={onClose}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Selecionar service</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {services.map((s) => {
            const ativo = s.id === selectedId;
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
                  <Text style={[styles.serviceName, ativo && { color: colors.text }]}>
                    {s.nome}
                  </Text>

                  <View style={styles.metaRow}>
                    <Feather name="star" size={10} color="#e06030" />
                    <Text style={styles.metaText}>
                      {s.nota} · {s.avaliacoes} avaliações
                    </Text>
                  </View>

                  {s.skill && (
                    <View style={styles.metaRow}>
                      <Feather name="tool" size={9} color="#e0603088" />
                      <Text style={[styles.metaText, { color: "#e0603088" }]}>
                        {s.skill}
                      </Text>
                    </View>
                  )}

                  {s.tools && s.tools.length > 0 && (
                    <View style={styles.metaRow}>
                      <Feather name="key" size={9} color={colors.textDim} />
                      <Text
                        style={[styles.metaText, { color: colors.textDim }]}
                        numberOfLines={1}
                      >
                        {s.tools.join(", ")}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.serviceRate, ativo && { color: "#e06030" }]}>
                  {formatRate(s.hourlyRate ?? 50)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

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
      marginBottom: 20,
    },
    title: {
      fontFamily: "Sora_700Bold",
      fontSize: 16,
      color: colors.text,
    },
    list: {
      gap: 8,
    },
    serviceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 24,
      padding: 16,
    },
    serviceRowActive: {
      backgroundColor: "#e0603008",
      borderColor: "#e0603030",
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
      borderColor: "#e06030",
    },
    radioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#e06030",
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
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: colors.textSecondary,
    },
    serviceRate: {
      fontFamily: "DMSans_500Medium",
      fontSize: 14,
      color: colors.textSecondary,
      flexShrink: 0,
    },
  });
}
