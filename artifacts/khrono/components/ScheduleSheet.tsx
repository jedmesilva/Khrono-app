import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
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

  function handleConfirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(data, hora, minuto, isAgendado);
    onClose();
  }

  function openPicker(mode: "date" | "time") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPicker(mode);
  }

  const pickerDate = new Date(data);
  pickerDate.setHours(hora, minuto, 0, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Agendar para</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable
          onPress={handleAgoraPress}
          style={[styles.optionRow, !isAgendado && styles.optionRowActive]}
        >
          <View style={[styles.optionIcon, !isAgendado && styles.optionIconActive]}>
            <Feather name="zap" size={18} color={!isAgendado ? "#ff6b35" : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionLabel, !isAgendado && styles.optionLabelActive]}>
              Agora
            </Text>
            <Text style={styles.optionSub}>Iniciar imediatamente</Text>
          </View>
          {!isAgendado && (
            <Feather name="check" size={16} color={"#ff6b35"} />
          )}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={() => openPicker("date")}
          style={[styles.optionRow, isAgendado && picker === "date" && styles.optionRowFocused]}
        >
          <View style={[styles.optionIcon, isAgendado && styles.optionIconActive]}>
            <Feather name="calendar" size={18} color={isAgendado ? "#ff6b35" : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionLabel}>Dia</Text>
            <Text style={[styles.optionSub, isAgendado && { color: "#ff6b35" }]}>
              {isAgendado ? formatDataLabel(data) : "Selecionar data"}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textDim} />
        </Pressable>

        <Pressable
          onPress={() => openPicker("time")}
          style={[styles.optionRow, isAgendado && picker === "time" && styles.optionRowFocused]}
        >
          <View style={[styles.optionIcon, isAgendado && styles.optionIconActive]}>
            <Feather name="clock" size={18} color={isAgendado ? "#ff6b35" : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionLabel}>Horário</Text>
            <Text style={[styles.optionSub, isAgendado && { color: "#ff6b35" }]}>
              {isAgendado
                ? `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`
                : "Selecionar horário"}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textDim} />
        </Pressable>

        {picker !== null && (
          <View style={styles.pickerWrap}>
            {Platform.OS === "ios" && (
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerHeaderLabel}>
                  {picker === "date" ? "Selecionar data" : "Selecionar horário"}
                </Text>
                <Pressable
                  onPress={() => setPicker(null)}
                  hitSlop={12}
                  style={styles.pickerDoneBtn}
                >
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

        <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
          <Feather name="check" size={16} color="#000" />
          <Text style={styles.confirmText}>
            {isAgendado
              ? `Agendar para ${formatDataLabel(data)} às ${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`
              : "Confirmar — iniciar agora"}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.7)",
    },
    sheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: colors.sheetBorder,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: colors.handleColor,
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
      color: colors.text,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginBottom: 6,
    },
    optionRowActive: {
      backgroundColor: "#ff6b3510",
      borderWidth: 1,
      borderColor: "#ff6b3530",
    },
    optionRowFocused: {
      backgroundColor: colors.cardBorder,
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
    },
    optionIconActive: {
      borderColor: "#ff6b3540",
      backgroundColor: "#ff6b3510",
    },
    optionLabel: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: colors.text,
      marginBottom: 2,
    },
    optionLabelActive: {
      color: "#ff6b35",
    },
    optionSub: {
      fontFamily: "DMMono_400Regular",
      fontSize: 11,
      color: colors.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: colors.sheetBorder,
      marginVertical: 6,
      marginHorizontal: 12,
    },
    pickerWrap: {
      marginTop: 4,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: "hidden",
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
      fontFamily: "DMMono_400Regular",
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    pickerDoneBtn: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: "#ff6b3520",
      borderRadius: 8,
    },
    pickerDoneText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 13,
      color: "#ff6b35",
    },
    picker: {
      backgroundColor: "transparent",
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 12,
      backgroundColor: "#00e5a0",
      borderRadius: 14,
      paddingVertical: 16,
    },
    confirmText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: "#000",
    },
  });
}
