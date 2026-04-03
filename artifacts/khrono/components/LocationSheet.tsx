import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
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
  wrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accentGreen + "40",
  },
  core: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accentGreen,
  },
});

function RadiusSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackWidth = useSharedValue(0);
  const thumbPos = useSharedValue(toSliderPos(value));
  const startPos = useSharedValue(0);
  const [displayMeters, setDisplayMeters] = useState(value);

  useEffect(() => {
    thumbPos.value = withTiming(toSliderPos(value), { duration: 200 });
    setDisplayMeters(value);
  }, [value]);

  const updateDisplay = (meters: number) => {
    setDisplayMeters(meters);
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      startPos.value = thumbPos.value;
    })
    .onUpdate((e) => {
      if (trackWidth.value === 0) return;
      const next = Math.max(0, Math.min(1, startPos.value + e.translationX / trackWidth.value));
      thumbPos.value = next;
      runOnJS(updateDisplay)(toMeters(next));
    })
    .onEnd(() => {
      runOnJS(onChange)(toMeters(thumbPos.value));
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbPos.value * trackWidth.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbPos.value * (trackWidth.value - THUMB_SIZE) }],
  }));

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.label}>Raio de atendimento</Text>
        <View style={sliderStyles.valuePill}>
          <Feather name="radio" size={10} color={Colors.accent} />
          <Text style={sliderStyles.valueText}>{formatRadius(displayMeters)}</Text>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          style={sliderStyles.track}
          onLayout={(e) => {
            trackWidth.value = e.nativeEvent.layout.width;
          }}
        >
          <View style={sliderStyles.trackBg} />
          <Animated.View style={[sliderStyles.trackFill, fillStyle]} />
          <Animated.View style={[sliderStyles.thumb, thumbStyle]}>
            <View style={sliderStyles.thumbInner} />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={sliderStyles.rangeRow}>
        <Text style={sliderStyles.rangeText}>10 m</Text>
        <Text style={sliderStyles.rangeText}>100 km</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    gap: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#ccc",
  },
  valuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.accent + "15",
    borderWidth: 1,
    borderColor: Colors.accent + "30",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  valueText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 12,
    color: Colors.accent,
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
    backgroundColor: "#1e1e1e",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#0f0f0f",
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    top: (44 - THUMB_SIZE) / 2,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rangeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
  },
});

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: LocationMode;
  fixedAddress: string;
  serviceRadius: number;
  onSave: (mode: LocationMode, address: string, radius: number) => void;
};

export function LocationSheet({ visible, onClose, mode, fixedAddress, serviceRadius, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
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
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
      onDismiss={onClose}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Localização de serviço</Text>
          <Text style={styles.subtitle}>
            Define onde você está disponível para atender
          </Text>

          <View style={styles.optionsWrap}>
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
                      backgroundColor: Colors.accentGreen + "18",
                      borderColor: Colors.accentGreen + "30",
                    },
                  ]}
                >
                  <PulsingDot />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={styles.optionLabel}>Tempo real</Text>
                  <Text style={styles.optionDesc}>
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
                    <Feather name="navigation" size={11} color={Colors.accentGreen} />
                    <Text style={styles.realtimeText}>
                      Belo Horizonte, MG · atualizado agora
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>

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
                      backgroundColor: Colors.accent + "18",
                      borderColor: Colors.accent + "30",
                    },
                  ]}
                >
                  <Feather
                    name="map-pin"
                    size={20}
                    color={selectedMode === "fixed" ? Colors.accent : "#444"}
                  />
                </View>
                <View style={styles.optionTexts}>
                  <Text style={styles.optionLabel}>Localização fixa</Text>
                  <Text style={styles.optionDesc}>
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
                    <View style={[styles.radioInner, { backgroundColor: Colors.accent }]} />
                  )}
                </View>
              </View>

              {selectedMode === "fixed" && (
                <View style={styles.addressWrap}>
                  <View style={styles.addressInputRow}>
                    <Feather name="search" size={14} color="#444" />
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Ex: Belo Horizonte, MG"
                      placeholderTextColor="#2a2a2a"
                      style={styles.addressInput}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                    {address.length > 0 && (
                      <Pressable onPress={() => setAddress("")}>
                        <Feather name="x" size={13} color="#333" />
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.addressHint}>
                    Informe a cidade ou bairro onde você atende
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.radiusWrap}>
            <RadiusSlider value={radius} onChange={setRadius} />
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={13} color="#333" />
            <Text style={styles.infoText}>
              Clientes só verão sua localização aproximada, nunca o endereço exato.
            </Text>
          </View>

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

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: "#1e1e1e",
  },
  handle: {
    backgroundColor: "#2a2a2a",
    width: 36,
    height: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    color: "#fff",
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    marginBottom: 4,
  },
  optionsWrap: {
    gap: 10,
  },
  optionCard: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  optionCardActive: {
    borderColor: Colors.accentGreen + "40",
    backgroundColor: Colors.accentGreen + "06",
  },
  optionCardActiveBlue: {
    borderColor: Colors.accent + "40",
    backgroundColor: Colors.accent + "06",
  },
  optionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  optionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionTexts: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
    marginBottom: 3,
  },
  optionDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioActive: {
    borderColor: Colors.accentGreen,
  },
  radioActiveBlue: {
    borderColor: Colors.accent,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.accentGreen,
  },
  realtimeInfo: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.accentGreen + "15",
  },
  realtimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  realtimeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: Colors.accentGreen + "aa",
  },
  addressWrap: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.accent + "15",
    gap: 8,
  },
  addressInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addressInput: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#fff",
  },
  addressHint: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    lineHeight: 15,
  },
  radiusWrap: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 18,
    padding: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.35,
  },
  saveBtnText: {
    fontFamily: "Sora_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
