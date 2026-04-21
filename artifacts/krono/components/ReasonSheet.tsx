import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { GlobalStyles } from "@/constants/globalStyles";

export type ReasonSheetMode = "end" | "cancel";

type Reason = {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
};

const END_REASONS: Reason[] = [
  {
    id: "completed",
    label: "Serviço concluído com sucesso",
    description: "O trabalho foi realizado conforme combinado",
    icon: "check-circle",
  },
  {
    id: "partial",
    label: "Serviço parcialmente concluído",
    description: "Parte do trabalho foi realizada",
    icon: "clock",
  },
  {
    id: "dissatisfied",
    label: "Insatisfação com o serviço",
    description: "O resultado não atendeu às expectativas",
    icon: "thumbs-down",
  },
  {
    id: "not_done",
    label: "Serviço não realizado",
    description: "O trabalho não chegou a ser executado",
    icon: "x-circle",
  },
  {
    id: "agreement",
    label: "Acordo entre as partes",
    description: "Encerramento por mútuo acordo",
    icon: "users",
  },
];

const CANCEL_REASONS: Reason[] = [
  {
    id: "personal",
    label: "Imprevisto pessoal",
    description: "Situação inesperada impediu a continuação",
    icon: "user-x",
  },
  {
    id: "plans_changed",
    label: "Mudança de planos",
    description: "A necessidade do serviço mudou",
    icon: "refresh-cw",
  },
  {
    id: "mistake",
    label: "Erro na contratação",
    description: "O contrato foi criado por engano",
    icon: "alert-circle",
  },
  {
    id: "no_show",
    label: "Prestador não compareceu",
    description: "O prestador não apareceu no horário",
    icon: "user-minus",
  },
  {
    id: "agreement",
    label: "Acordo entre as partes",
    description: "Cancelamento por mútuo acordo",
    icon: "users",
  },
];

type Props = {
  visible: boolean;
  mode: ReasonSheetMode;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function ReasonSheet({ visible, mode, onClose, onConfirm }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%"], []);

  const reasons = mode === "end" ? END_REASONS : CANCEL_REASONS;
  const isEnd = mode === "end";

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

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
        pressBehavior="close"
      />
    ),
    []
  );

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
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEnd ? "Encerrar contrato" : "Cancelar contrato"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isEnd
              ? "Selecione o motivo do encerramento"
              : "Selecione o motivo do cancelamento"}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12}>
          <Feather name="x" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {reasons.map((reason) => (
          <Pressable
            key={reason.id}
            onPress={() => {
              onConfirm(reason.label);
              onClose();
            }}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={[GlobalStyles.iconWrap, { backgroundColor: colors.menuIconBg }]}>
              <Feather
                name={reason.icon}
                size={16}
                color={colors.textSecondary}
              />
            </View>
            <View style={styles.itemContent}>
              <Text
                style={[styles.itemLabel, { color: colors.text }]}
                numberOfLines={1}
              >
                {reason.label}
              </Text>
              <Text
                style={[
                  styles.itemDescription,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {reason.description}
              </Text>
            </View>
            <Feather name="chevron-right" size={15} color={colors.textMuted} />
          </Pressable>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 4,
    marginBottom: 20,
  },
  title: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 18,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  itemDescription: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
});
