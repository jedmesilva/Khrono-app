import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
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
import { AddressSheet, AddressResult } from "@/components/AddressSheet";

export type { LocationMode };

const ORANGE = "#e06030";
const ORANGE_LIGHT = "#FEF3EF";
const ORANGE_BORDER = "#F5C4B0";

const LOG_MIN = Math.log(10);
const LOG_MAX = Math.log(100000);
const THUMB_SIZE = 24;

const RADIUS_SHORTCUTS_M = [500, 1000, 2000, 5000, 10000, 25000, 50000];

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
    backgroundColor: "#e0603040",
  },
  core: { width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE },
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
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        startPosRef.current = currentPosRef.current;
      },
      onPanResponderMove: (_, gs) => {
        if (widthRef.current === 0) return;
        const newPos = Math.max(0, Math.min(1, startPosRef.current + gs.dx / widthRef.current));
        currentPosRef.current = newPos;
        setDisplayPos(newPos);
      },
      onPanResponderRelease: (_, gs) => {
        if (widthRef.current === 0) return;
        const newPos = Math.max(0, Math.min(1, startPosRef.current + gs.dx / widthRef.current));
        currentPosRef.current = newPos;
        setDisplayPos(newPos);
        onChange(toMeters(newPos));
      },
      onPanResponderTerminate: () => {},
    })
  ).current;

  const displayMeters = toMeters(displayPos);
  const thumbLeft = displayPos * Math.max(0, trackWidth - THUMB_SIZE);

  const handleShortcut = (meters: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pos = toSliderPos(meters);
    currentPosRef.current = pos;
    setDisplayPos(pos);
    onChange(meters);
  };

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.label}>Raio de atendimento</Text>
        <Text style={sliderStyles.valueText}>{formatRadius(displayMeters)}</Text>
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

      <View style={sliderStyles.chips}>
        {RADIUS_SHORTCUTS_M.map((m) => {
          const active = Math.abs(displayMeters - m) < m * 0.05;
          return (
            <Pressable
              key={m}
              onPress={() => handleShortcut(m)}
              style={[sliderStyles.chip, active && sliderStyles.chipActive]}
            >
              <Text style={[sliderStyles.chipText, active && sliderStyles.chipTextActive]}>
                {formatRadius(m)}
              </Text>
            </Pressable>
          );
        })}
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
      fontSize: 14,
      color: colors.text,
    },
    valueText: {
      fontFamily: "Sora_700Bold",
      fontSize: 16,
      color: ORANGE,
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
      backgroundColor: ORANGE,
    },
    thumb: {
      position: "absolute",
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: ORANGE,
      alignItems: "center",
      justifyContent: "center",
      top: (44 - THUMB_SIZE) / 2,
    },
    thumbInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: ORANGE,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 2,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    chipActive: {
      borderColor: ORANGE,
      backgroundColor: ORANGE_LIGHT,
    },
    chipText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 12,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: ORANGE,
    },
  });
}

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: LocationMode;
  fixedAddress: string;
  fixedLat?: number | null;
  fixedLng?: number | null;
  serviceRadius: number;
  realtimeUpdatedAt?: Date | null;
  onSave: (mode: LocationMode, address: string, radius: number, lat?: number, lng?: number) => Promise<void>;
};

function formatLastUpdate(date: Date | null | undefined): string {
  if (!date) return "aguardando GPS...";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "agora mesmo";
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes}min`;
  return `há ${Math.floor(minutes / 60)}h`;
}

export function LocationSheet({
  visible,
  onClose,
  mode,
  fixedAddress,
  fixedLat,
  fixedLng,
  serviceRadius,
  realtimeUpdatedAt,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedMode, setSelectedMode] = useState<LocationMode>(mode);
  const [address, setAddress] = useState(fixedAddress);
  const [addressLat, setAddressLat] = useState<number | undefined>(
    fixedLat != null ? fixedLat : undefined
  );
  const [addressLng, setAddressLng] = useState<number | undefined>(
    fixedLng != null ? fixedLng : undefined
  );
  const [radius, setRadius] = useState(serviceRadius);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  // Tracks whether the AddressSheet is open so we can block onDismiss
  const addressSheetOpenRef = useRef(false);
  // Preserves the user's address selection across the BottomSheetModal dismiss/re-present cycle
  const pendingSelectionRef = useRef<{ address: string; lat?: number; lng?: number } | null>(null);

  const snapPoints = useMemo(() => ["80%"], []);

  useEffect(() => {
    if (visible) {
      setSelectedMode(mode);
      // Restore pending selection (from before AddressSheet opened) or reset from props
      if (pendingSelectionRef.current) {
        const { address: a, lat, lng } = pendingSelectionRef.current;
        setAddress(a);
        setAddressLat(lat);
        setAddressLng(lng);
        pendingSelectionRef.current = null;
      } else {
        setAddress(fixedAddress);
        setAddressLat(fixedLat != null ? fixedLat : undefined);
        setAddressLng(fixedLng != null ? fixedLng : undefined);
      }
      setRadius(serviceRadius);
      setSaving(false);
      setSaved(false);
      setSaveError(false);
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const handleAddressSelect = useCallback((result: AddressResult) => {
    // Save in ref so the selection survives a BottomSheetModal dismiss/present cycle
    pendingSelectionRef.current = { address: result.label, lat: result.lat, lng: result.lng };
    setAddress(result.label);
    setAddressLat(result.lat);
    setAddressLng(result.lng);
  }, []);

  const handleOpenAddressSheet = useCallback(() => {
    addressSheetOpenRef.current = true;
    setAddressSheetOpen(true);
  }, []);

  const handleCloseAddressSheet = useCallback(() => {
    addressSheetOpenRef.current = false;
    setAddressSheetOpen(false);
    // Re-present the BottomSheetModal in case it was dismissed while AddressSheet was open
    ref.current?.present();
  }, []);

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

  const handleSelectMode = (m: LocationMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMode(m);
  };

  const canSave = selectedMode === "realtime" || address.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      if (selectedMode === "fixed") {
        await onSave(selectedMode, address, radius, addressLat, addressLng);
      } else {
        await onSave(selectedMode, fixedAddress, radius);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => {
        setSaving(false);
        setSaved(false);
        onClose();
      }, 1200);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSaving(false);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.sheetBg,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        borderTopWidth: 1,
        borderColor: colors.sheetBorder,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.handleColor, width: 36, height: 4 }}
      onDismiss={() => {
        // Don't propagate dismiss while AddressSheet is open — it will re-present itself
        if (!addressSheetOpenRef.current) {
          onClose();
        }
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={styles.title}>Localização de disponibilidade</Text>
          <Text style={styles.subtitle}>
            Define onde você está disponível para atender
          </Text>

          {/* Segmented control */}
          <View style={styles.segmented}>
            {(
              [
                { id: "realtime", label: "Minha localização" },
                { id: "fixed", label: "Localização fixa" },
              ] as { id: LocationMode; label: string }[]
            ).map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => handleSelectMode(opt.id)}
                style={[
                  styles.segmentBtn,
                  selectedMode === opt.id && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selectedMode === opt.id && styles.segmentTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Location display */}
          {selectedMode === "realtime" ? (
            <View style={styles.gpsBanner}>
              <PulsingDot />
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsTitle}>Localização atual</Text>
                <Text style={styles.gpsSub}>
                  GPS ativo · {formatLastUpdate(realtimeUpdatedAt)}
                </Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.addressDisplay,
                pressed && styles.addressDisplayPressed,
                address.length > 0 && styles.addressDisplayFilled,
              ]}
              onPress={handleOpenAddressSheet}
            >
              <Feather
                name="map-pin"
                size={15}
                color={address.length > 0 ? ORANGE : colors.textMuted}
              />
              <Text
                style={[
                  styles.addressDisplayText,
                  address.length === 0 && styles.addressDisplayPlaceholder,
                ]}
                numberOfLines={1}
              >
                {address.length > 0 ? address : "Toque para definir a localização"}
              </Text>
              <Feather
                name={address.length > 0 ? "edit-2" : "chevron-right"}
                size={14}
                color={address.length > 0 ? ORANGE : colors.chevron}
              />
            </Pressable>
          )}

          {/* Radius slider */}
          <View style={styles.sliderCard}>
            <RadiusSlider value={radius} onChange={setRadius} />
          </View>

          {/* Privacy note */}
          <View style={styles.privacyRow}>
            <Feather name="lock" size={13} color={colors.textMuted} style={{ marginTop: 1 }} />
            <Text style={[styles.privacyText, { color: colors.textMuted }]}>
              Clientes veem apenas sua localização{" "}
              <Text style={{ fontFamily: "DMSans_600SemiBold" }}>aproximada</Text>,
              nunca o endereço exato.
            </Text>
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave || saving}
            style={[
              styles.saveBtn,
              (!canSave || saving) && !saveError && styles.saveBtnDisabled,
              saveError && styles.saveBtnError,
            ]}
          >
            <Feather
              name={saved ? "check" : saving ? "loader" : saveError ? "alert-circle" : "save"}
              size={15}
              color={!canSave && !saveError ? colors.textDim : "#fff"}
            />
            <Text style={[styles.saveBtnText, !canSave && !saveError && styles.saveBtnTextDisabled]}>
              {saved
                ? "Salvo!"
                : saving
                ? "Salvando..."
                : saveError
                ? "Erro ao salvar. Tente novamente."
                : !canSave
                ? "Informe a localização para continuar"
                : "Salvar"}
            </Text>
          </Pressable>
        </BottomSheetScrollView>

      <AddressSheet
        visible={addressSheetOpen}
        onClose={handleCloseAddressSheet}
        onSelect={handleAddressSelect}
        title="Localização fixa"
        placeholder="Ex: Belo Horizonte, MG"
      />
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
      letterSpacing: -0.3,
    },
    subtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginTop: -6,
    },

    segmented: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 4,
    },
    segmentBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentBtnActive: {
      backgroundColor: ORANGE,
    },
    segmentText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: "#fff",
      fontFamily: "Sora_600SemiBold",
    },

    gpsBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: 14,
      backgroundColor: ORANGE_LIGHT,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: ORANGE_BORDER,
    },
    gpsTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
      color: colors.text,
    },
    gpsSub: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: ORANGE,
      marginTop: 1,
    },

    addressDisplay: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 50,
    },
    addressDisplayPressed: {
      backgroundColor: colors.rowPressed,
    },
    addressDisplayFilled: {
      borderColor: ORANGE,
      backgroundColor: ORANGE_LIGHT,
    },
    addressDisplayText: {
      flex: 1,
      fontFamily: "DMSans_500Medium",
      fontSize: 14,
      color: colors.text,
    },
    addressDisplayPlaceholder: {
      color: colors.textDim,
      fontFamily: "DMSans_400Regular",
    },

    sliderCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 18,
      padding: 16,
    },

    privacyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
    },
    privacyText: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      lineHeight: 18,
    },

    saveBtn: {
      backgroundColor: ORANGE,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
    },
    saveBtnDisabled: {
      backgroundColor: colors.surfaceBorder,
    },
    saveBtnError: {
      backgroundColor: "#C0392B",
    },
    saveBtnText: {
      fontFamily: "Sora_700Bold",
      fontSize: 15,
      color: "#fff",
    },
    saveBtnTextDisabled: {
      color: colors.textDim,
    },
  });
}
