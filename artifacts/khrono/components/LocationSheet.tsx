import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { LocationMode } from "@/constants/profile-data";

export type { LocationMode };

const LOG_MIN = Math.log(10);
const LOG_MAX = Math.log(100000);
const THUMB_SIZE = 24;

function toSliderPos(meters: number): number {
  return (Math.log(Math.max(10, Math.min(100000, meters))) - LOG_MIN) / (LOG_MAX - LOG_MIN);
}

function toMeters(pos: number): number {
  return Math.round(Math.exp(LOG_MIN + Math.max(0, Math.min(1, pos)) * (LOG_MAX - LOG_MIN)));
}

export function formatRadius(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  if (km >= 10) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
}

function PulsingDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.1, { duration: 900 }), withTiming(0.6, { duration: 900 })),
      -1,
      false
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={dot.wrap}>
      <Animated.View style={[dot.ring, ringStyle]} />
      <View style={dot.core} />
    </View>
  );
}

const dot = StyleSheet.create({
  wrap: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#18a06b40",
  },
  core: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#18a06b" },
});

function RadiusSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const sliderStyles = useMemo(() => createSliderStyles(colors), [colors]);

  const widthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const startPosRef = useRef(0);
  const currentPosRef = useRef(toSliderPos(value));
  const [displayPos, setDisplayPos] = useState(toSliderPos(value));

  useEffect(() => {
    const pos = toSliderPos(value);
    currentPosRef.current = pos;
    setDisplayPos(pos);
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        startPosRef.current = currentPosRef.current;
      },
      onPanResponderMove: (_, gs) => {
        if (widthRef.current === 0) return;
        const newPos = Math.max(
          0,
          Math.min(1, startPosRef.current + gs.dx / widthRef.current)
        );
        currentPosRef.current = newPos;
        setDisplayPos(newPos);
      },
      onPanResponderRelease: (_, gs) => {
        if (widthRef.current === 0) return;
        const newPos = Math.max(
          0,
          Math.min(1, startPosRef.current + gs.dx / widthRef.current)
        );
        currentPosRef.current = newPos;
        setDisplayPos(newPos);
        onChange(toMeters(newPos));
      },
      onPanResponderTerminate: () => {},
    })
  ).current;

  const displayMeters = toMeters(displayPos);
  const thumbLeft = displayPos * Math.max(0, trackWidth - THUMB_SIZE);

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.label}>Raio de atendimento</Text>
        <View style={sliderStyles.valuePill}>
          <Feather name="radio" size={10} color={"#e06030"} />
          <Text style={sliderStyles.valueText}>{formatRadius(displayMeters)}</Text>
        </View>
      </View>

      <View
        style={sliderStyles.track}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          setTrackWidth(e.nativeEvent.layout.width);
        }}
        {...panResponder.panHandlers}
      >
        <View style={sliderStyles.trackBg} />
        <View style={[sliderStyles.trackFill, { width: `${displayPos * 100}%` as any }]} />
        <View style={[sliderStyles.thumb, { left: thumbLeft }]}>
          <View style={sliderStyles.thumbInner} />
        </View>
      </View>

      <View style={sliderStyles.rangeRow}>
        <Text style={sliderStyles.rangeText}>10 m</Text>
        <Text style={sliderStyles.rangeText}>100 km</Text>
      </View>
    </View>
  );
}

function createSliderStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { gap: 10 },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 13,
      color: colors.textSecondary,
    },
    valuePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#e0603015",
      borderWidth: 1,
      borderColor: "#e0603030",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    valueText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      color: "#e06030",
    },
    track: {
      height: 44,
      justifyContent: "center",
      position: "relative",
    },
    trackBg: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceBorder,
    },
    trackFill: {
      position: "absolute",
      left: 0,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#e06030",
    },
    thumb: {
      position: "absolute",
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: "#e06030",
      alignItems: "center",
      justifyContent: "center",
      top: (44 - THUMB_SIZE) / 2,
    },
    thumbInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#e06030",
    },
    rangeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    rangeText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: colors.textDim,
    },
  });
}

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: LocationMode;
  fixedAddress: string;
  serviceRadius: number;
  onSave: (mode: LocationMode, address: string, radius: number) => void;
};

export function LocationSheet({
  visible,
  onClose,
  mode,
  fixedAddress,
  serviceRadius,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedMode, setSelectedMode] = useState<LocationMode>(mode);
  const [address, setAddress] = useState(fixedAddress);
  const [radius, setRadius] = useState(serviceRadius);

  const snapPoints = useMemo(() => ["88%"], []);

  useEffect(() => {
    if (visible) {
      setSelectedMode(mode);
      setAddress(fixedAddress);
      setRadius(serviceRadius);
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

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(selectedMode, selectedMode === "fixed" ? address : fixedAddress, radius);
    onClose();
  };

  const handleSelectMode = (m: LocationMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMode(m);
  };

  const hasChanges =
    selectedMode !== mode ||
    radius !== serviceRadius ||
    (selectedMode === "fixed" && address !== fixedAddress);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.sheetBg, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: colors.sheetBorder }}
      handleIndicatorStyle={{ backgroundColor: colors.handleColor, width: 36, height: 4 }}
      onDismiss={onClose}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>Localização de serviço</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Define onde você está disponível para atender
          </Text>

          <View style={styles.optionsWrap}>
            {/* Real-time option */}
            <Pressable
              style={[
                styles.optionCard,
                selectedMode === "realtime" && styles.optionCardActive,
              ]}
              onPress={() => handleSelectMode("realtime")}
            >
              <View style={styles.optionTop}>
                <View
                  style={[
                    styles.optionIconWrap,
                    selectedMode === "realtime" && {
                      backgroundColor: "#18a06b18",
                      borderColor: "#18a06b30",
                    },
                  ]}
                >
                  <PulsingDot />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>Tempo real</Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    Usa sua localização GPS atual
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedMode === "realtime" && styles.radioActive,
                  ]}
                >
                  {selectedMode === "realtime" && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>

              {selectedMode === "realtime" && (
                <View style={styles.realtimeInfo}>
                  <View style={styles.realtimeRow}>
                    <Feather
                      name="navigation"
                      size={11}
                      color={"#18a06b"}
                    />
                    <Text style={styles.realtimeText}>
                      Belo Horizonte, MG · atualizado agora
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>

            {/* Fixed location option */}
            <Pressable
              style={[
                styles.optionCard,
                selectedMode === "fixed" && styles.optionCardActiveBlue,
              ]}
              onPress={() => handleSelectMode("fixed")}
            >
              <View style={styles.optionTop}>
                <View
                  style={[
                    styles.optionIconWrap,
                    selectedMode === "fixed" && {
                      backgroundColor: "#e0603018",
                      borderColor: "#e0603030",
                    },
                  ]}
                >
                  <Feather
                    name="map-pin"
                    size={20}
                    color={selectedMode === "fixed" ? "#e06030" : colors.textMuted}
                  />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>Localização fixa</Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    Atende somente em uma região definida
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedMode === "fixed" && styles.radioActiveBlue,
                  ]}
                >
                  {selectedMode === "fixed" && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: "#e06030" },
                      ]}
                    />
                  )}
                </View>
              </View>

              {selectedMode === "fixed" && (
                <View style={styles.addressWrap}>
                  <View style={[styles.addressInputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <Feather name="search" size={14} color={colors.textMuted} />
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Ex: Belo Horizonte, MG"
                      placeholderTextColor={colors.textDim}
                      style={[styles.addressInput, { color: colors.text }]}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                    {address.length > 0 && (
                      <Pressable onPress={() => setAddress("")}>
                        <Feather name="x" size={13} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                  <Text style={[styles.addressHint, { color: colors.textMuted }]}>
                    Informe a cidade ou bairro onde você atende
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Radius slider */}
          <View style={styles.radiusWrap}>
            <RadiusSlider value={radius} onChange={setRadius} />
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Feather name="info" size={13} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Clientes só verão sua localização aproximada, nunca o endereço
              exato.
            </Text>
          </View>

          {/* Save button */}
          <Pressable
            style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={selectedMode === "fixed" && address.trim().length === 0}
          >
            <Feather name="check" size={15} color="#fff" />
            <Text style={styles.saveBtnText}>Salvar configuração</Text>
          </Pressable>
        </BottomSheetScrollView>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
    title: {
      fontFamily: "Sora_700Bold",
      fontSize: 18,
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 4,
    },
    optionsWrap: { gap: 10 },
    optionCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    optionCardActive: {
      borderColor: "#18a06b40",
      backgroundColor: "#18a06b06",
    },
    optionCardActiveBlue: {
      borderColor: "#e0603040",
      backgroundColor: "#e0603006",
    },
    optionTop: { flexDirection: "row", alignItems: "center", gap: 14 },
    optionIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 13,
      backgroundColor: colors.menuIconBg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    optionTexts: { flex: 1 },
    optionLabel: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: colors.text,
      marginBottom: 3,
    },
    optionDesc: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.chevron,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    radioActive: { borderColor: "#18a06b" },
    radioActiveBlue: { borderColor: "#e06030" },
    radioInner: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: "#18a06b",
    },
    realtimeInfo: {
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: "#18a06b15",
    },
    realtimeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    realtimeText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: "#18a06baa",
    },
    addressWrap: {
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: "#e0603015",
      gap: 8,
    },
    addressInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    addressInput: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.text,
    },
    addressHint: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: colors.textMuted,
      lineHeight: 15,
    },
    radiusWrap: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 18,
      padding: 16,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 12,
    },
    infoText: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 16,
    },
    saveBtn: {
      backgroundColor: "#e06030",
      borderRadius: 14,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
    },
    saveBtnDisabled: { opacity: 0.35 },
    saveBtnText: { fontFamily: "Sora_700Bold", fontSize: 15, color: "#fff" },
  });
}
