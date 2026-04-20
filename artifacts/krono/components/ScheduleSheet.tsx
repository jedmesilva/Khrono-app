import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "@/lib/haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPalette, useTheme } from "@/context/ThemeContext";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Props = {
  visible: boolean;
  onClose: () => void;
  initialDate: Date;
  initialHora: number;
  initialMinuto: number;
  agendado: boolean;
  onConfirm: (date: Date, hora: number, minuto: number, agendado: boolean) => void;
};

function formatDataLabel(date: Date): string {
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  if (date.toDateString() === hoje.toDateString()) return "Hoje";
  if (date.toDateString() === amanha.toDateString()) return "Amanhã";
  return `${DIAS_SEMANA[date.getDay()]}, ${date.getDate()} ${MESES[date.getMonth()]}`;
}

export function ScheduleSheet({
  visible,
  onClose,
  initialDate,
  initialHora,
  initialMinuto,
  agendado,
  onConfirm,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ref = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ["55%", "80%"], []);

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
    () => ({ backgroundColor: colors.handleColor, width: 36, height: 4 }),
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

  const [data, setData] = useState(initialDate);
  const [hora, setHora] = useState(initialHora);
  const [minuto, setMinuto] = useState(initialMinuto);
  const [isAgendado, setIsAgendado] = useState(agendado);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);

  useEffect(() => {
    if (visible) {
      setData(initialDate);
      setHora(initialHora);
      setMinuto(initialMinuto);
      setIsAgendado(agendado);
      setPicker(null);
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  function handleDateChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setPicker(null);
    if (selected) {
      setData(selected);
      setIsAgendado(true);
    }
  }

  function handleTimeChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setPicker(null);
    if (selected) {
      setHora(selected.getHours());
      setMinuto(selected.getMinutes());
      setIsAgendado(true);
    }
  }

  function handleAgoraPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAgendado(false);
    setPicker(null);
  }

  function openPicker(mode: "date" | "time") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPicker(mode);
  }

  function handleConfirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(data, hora, minuto, isAgendado);
    ref.current?.dismiss();
    onClose();
  }

  const pickerDate = new Date(data);
  pickerDate.setHours(hora, minuto, 0, 0);

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
          <Text style={styles.title}>Agendar para</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Agora */}
        <Pressable
          onPress={handleAgoraPress}
          style={[styles.optionRow, !isAgendado && styles.optionRowActive]}
        >
          <View style={[styles.optionIcon, !isAgendado && styles.optionIconActive]}>
            <Feather name="zap" size={18} color={!isAgendado ? colors.accent : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionLabel, !isAgendado && styles.optionLabelActive]}>
              Agora
            </Text>
            <Text style={styles.optionSub}>Iniciar imediatamente</Text>
          </View>
          {!isAgendado && (
            <Feather name="check" size={16} color={colors.accent} />
          )}
        </Pressable>

        <View style={styles.divider} />

        {/* Dia */}
        <Pressable
          onPress={() => openPicker("date")}
          style={[styles.optionRow, isAgendado && picker === "date" && styles.optionRowFocused]}
        >
          <View style={[styles.optionIcon, isAgendado && styles.optionIconActive]}>
            <Feather name="calendar" size={18} color={isAgendado ? colors.accent : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionLabel}>Dia</Text>
            <Text style={[styles.optionSub, isAgendado && { color: colors.accent }]}>
              {isAgendado ? formatDataLabel(data) : "Selecionar data"}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textDim} />
        </Pressable>

        {/* Horário */}
        <Pressable
          onPress={() => openPicker("time")}
          style={[styles.optionRow, isAgendado && picker === "time" && styles.optionRowFocused]}
        >
          <View style={[styles.optionIcon, isAgendado && styles.optionIconActive]}>
            <Feather name="clock" size={18} color={isAgendado ? colors.accent : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionLabel}>Horário</Text>
            <Text style={[styles.optionSub, isAgendado && { color: colors.accent }]}>
              {isAgendado
                ? `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`
                : "Selecionar horário"}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textDim} />
        </Pressable>

        {/* DateTimePicker nativo */}
        {picker !== null && (
          <View style={styles.pickerWrap}>
            {Platform.OS === "ios" && (
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerHeaderLabel}>
                  {picker === "date" ? "Selecionar data" : "Selecionar horário"}
                </Text>
                <Pressable onPress={() => setPicker(null)} hitSlop={12} style={styles.pickerDoneBtn}>
                  <Text style={styles.pickerDoneText}>OK</Text>
                </Pressable>
              </View>
            )}
            <DateTimePicker
              value={pickerDate}
              mode={picker}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={picker === "date" ? handleDateChange : handleTimeChange}
              minimumDate={picker === "date" ? new Date() : undefined}
              locale="pt-BR"
              style={styles.picker}
            />
          </View>
        )}

        {/* Confirmar */}
        <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.confirmText}>
            {isAgendado
              ? `Agendar para ${formatDataLabel(data)} às ${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`
              : "Confirmar — iniciar agora"}
          </Text>
        </Pressable>
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
    divider: {
      height: 1,
      backgroundColor: colors.surfaceBorder,
      marginVertical: 4,
      marginHorizontal: 4,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginBottom: 4,
    },
    optionRowActive: {
      backgroundColor: colors.accent + "10",
      borderWidth: 1,
      borderColor: colors.accent + "30",
    },
    optionRowFocused: {
      backgroundColor: colors.surface,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    optionIconActive: {
      backgroundColor: colors.accent + "15",
      borderColor: colors.accent + "30",
    },
    optionLabel: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    optionLabelActive: {
      color: colors.text,
    },
    optionSub: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textMuted,
    },
    pickerWrap: {
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      overflow: "hidden",
      marginBottom: 4,
    },
    pickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    pickerHeaderLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    pickerDoneBtn: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: colors.accent + "20",
      borderRadius: 8,
    },
    pickerDoneText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 13,
      color: colors.accent,
    },
    picker: {
      backgroundColor: "transparent",
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 16,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
    },
    confirmText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: "#fff",
    },
  });
}
