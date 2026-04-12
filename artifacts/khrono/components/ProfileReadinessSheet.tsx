import { Feather } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import type { ProfileReadiness } from "@/context/AvailabilityContext";

type Props = {
  visible: boolean;
  readiness: ProfileReadiness;
  onClose: () => void;
};

type CheckItem = {
  label: string;
  done: boolean;
  route?: string;
  routeLabel?: string;
};

export function ProfileReadinessSheet({ visible, readiness, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const snapPoints = useMemo(() => ["58%"], []);

  const sheetBgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
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
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.75}
        pressBehavior="close"
      />
    ),
    []
  );

  const checks: CheckItem[] = [
    {
      label: "Pelo menos 1 serviço ativo",
      done: !readiness.missing.some((m) => m.includes("serviço")),
      route: "/cadastro-service",
      routeLabel: "Adicionar serviço",
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const totalCount = checks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

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
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: "#e0903012", borderColor: "#e0903025" }]}>
            <Feather name="alert-circle" size={20} color="#e09030" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Complete seu perfil
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Para ficar disponível, você precisa concluir o cadastro antes de ativar sua sessão.
          </Text>
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>PROGRESSO DO PERFIL</Text>
            <Text style={[styles.progressCount, { color: colors.text }]}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: progress === 1 ? "#18a06b" : "#e09030",
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.checkList}>
          {checks.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.checkItem,
                {
                  backgroundColor: colors.card,
                  borderColor: item.done ? "#18a06b25" : "#e0903025",
                },
              ]}
            >
              <View
                style={[
                  styles.checkIcon,
                  {
                    backgroundColor: item.done ? "#18a06b12" : "#e0903012",
                    borderColor: item.done ? "#18a06b30" : "#e0903030",
                  },
                ]}
              >
                <Feather
                  name={item.done ? "check" : "x"}
                  size={13}
                  color={item.done ? "#18a06b" : "#e09030"}
                />
              </View>
              <Text style={[styles.checkLabel, { color: colors.textSecondary, flex: 1 }]}>
                {item.label}
              </Text>
              {!item.done && item.route && (
                <Pressable
                  style={({ pressed }) => [
                    styles.checkAction,
                    { borderColor: "#e0603040" },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    ref.current?.dismiss();
                    setTimeout(() => router.push(item.route as any), 200);
                  }}
                >
                  <Text style={[styles.checkActionText, { color: "#e06030" }]}>
                    {item.routeLabel}
                  </Text>
                  <Feather name="arrow-right" size={11} color="#e06030" />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.dismissBtn,
            { borderColor: colors.surfaceBorder },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            ref.current?.dismiss();
          }}
        >
          <Text style={[styles.dismissText, { color: colors.textMuted }]}>Fechar</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12,
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 0.1,
    paddingHorizontal: 8,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  progressCount: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  checkList: {
    gap: 8,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  checkAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkActionText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 11,
  },
  dismissBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderStyle: "dashed",
    marginTop: 4,
  },
  dismissText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
});
