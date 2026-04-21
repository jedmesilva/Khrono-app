import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import type { ThemePreference } from "@/context/ThemeContext";
import { useTheme } from "@/context/ThemeContext";
import { useUserSettings } from "@/context/UserSettingsContext";

type ToggleRowProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  accentGreen?: boolean;
};

type LinkRowProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
};

type ThemeColors = ReturnType<typeof useTheme>["colors"];

function SectionHeader({ title, colors }: { title: string; colors: ThemeColors }) {
  return (
    <Text style={[staticStyles.sectionHeader, { color: colors.textDim }]}>
      {title}
    </Text>
  );
}

function ToggleRow({ icon, label, sublabel, value, onValueChange, accentGreen, colors }: ToggleRowProps & { colors: ThemeColors }) {
  const color = accentGreen ? colors.accentGreen : colors.accent;
  return (
    <View style={staticStyles.row}>
      <View style={[staticStyles.iconWrap, { backgroundColor: colors.menuIconBg }]}>
        <Feather name={icon} size={15} color={colors.textSecondary} />
      </View>
      <View style={staticStyles.rowTexts}>
        <Text style={[staticStyles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sublabel && (
          <Text style={[staticStyles.rowSublabel, { color: colors.textDim }]}>
            {sublabel}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceBorder, true: color + "55" }}
        thumbColor={value ? color : colors.textMuted}
        ios_backgroundColor={colors.surfaceBorder}
      />
    </View>
  );
}

function LinkRow({ icon, label, sublabel, onPress, danger, colors }: LinkRowProps & { colors: ThemeColors }) {
  const color = danger ? "#ff3b30" : colors.textSecondary;
  return (
    <Pressable
      style={({ pressed }) => [
        staticStyles.row,
        pressed && { backgroundColor: colors.rowPressed },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          staticStyles.iconWrap,
          danger
            ? { backgroundColor: "#ff3b3012" }
            : { backgroundColor: colors.menuIconBg },
        ]}
      >
        <Feather name={icon} size={15} color={color} />
      </View>
      <View style={staticStyles.rowTexts}>
        <Text style={[staticStyles.rowLabel, danger ? { color: "#ff3b30" } : { color: colors.text }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[staticStyles.rowSublabel, { color: colors.textDim }]}>
            {sublabel}
          </Text>
        )}
      </View>
      {!danger && <Feather name="chevron-right" size={14} color={colors.chevron} />}
    </Pressable>
  );
}

const themeLabels: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
};

const nextThemePreference: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export default function DefinicoesScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;
  const { colors } = useTheme();
  const { settings, updateSetting } = useUserSettings();

  const handleSecurityToggle = (
    key: "two_factor_enabled" | "biometric_auth_enabled" | "facial_recognition_enabled",
    label: string,
    value: boolean
  ) => {
    if (!value) {
      updateSetting(key, false);
      return;
    }

    Alert.alert(
      "Configuração indisponível",
      `${label} precisa de um fluxo de segurança dedicado antes de poder ser ativado com segurança. Assim evitamos salvar uma opção que não protege a conta de verdade.`
    );
  };

  const sectionStyle = useMemo(
    () => ({
      backgroundColor: colors.card,
      borderRadius: 18,
      overflow: "hidden" as const,
      marginBottom: 20,
    }),
    [colors]
  );

  return (
    <View style={[staticStyles.container, { backgroundColor: colors.background, paddingTop: topPadding }]}>
      <ScreenHeader title="Definições" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[staticStyles.content, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
      >

        {/* Notificações */}
        <SectionHeader title="NOTIFICAÇÕES" colors={colors} />
        <View style={sectionStyle}>
          <ToggleRow
            icon="bell"
            label="Notificações push"
            sublabel="Receber alertas no dispositivo"
            value={settings.notification_push_enabled}
            onValueChange={(value) => updateSetting("notification_push_enabled", value)}
            colors={colors}
          />
          <View style={[staticStyles.rowDivider, { backgroundColor: colors.surface }]} />
          <ToggleRow
            icon="file-text"
            label="Novos contratos"
            sublabel="Quando alguém te contratar"
            value={settings.notification_contracts_enabled}
            onValueChange={(value) => updateSetting("notification_contracts_enabled", value)}
            colors={colors}
          />
          <View style={[staticStyles.rowDivider, { backgroundColor: colors.surface }]} />
          <ToggleRow
            icon="calendar"
            label="Lembretes de agenda"
            sublabel="Antes de um serviço agendado iniciar"
            value={settings.notification_schedule_enabled}
            onValueChange={(value) => updateSetting("notification_schedule_enabled", value)}
            colors={colors}
          />
        </View>

        {/* Segurança */}
        <SectionHeader title="SEGURANÇA" colors={colors} />
        <View style={sectionStyle}>
          <ToggleRow
            icon="shield"
            label="Autenticação de dois fatores"
            sublabel="Solicitar uma etapa extra ao entrar"
            value={settings.two_factor_enabled}
            onValueChange={(value) =>
              handleSecurityToggle("two_factor_enabled", "Autenticação de dois fatores", value)
            }
            accentGreen
            colors={colors}
          />
          <View style={[staticStyles.rowDivider, { backgroundColor: colors.surface }]} />
          <ToggleRow
            icon="lock"
            label="Biometria"
            sublabel="Usar impressão digital quando disponível"
            value={settings.biometric_auth_enabled}
            onValueChange={(value) =>
              handleSecurityToggle("biometric_auth_enabled", "Biometria", value)
            }
            accentGreen
            colors={colors}
          />
          <View style={[staticStyles.rowDivider, { backgroundColor: colors.surface }]} />
          <ToggleRow
            icon="camera"
            label="Reconhecimento facial"
            sublabel="Permitir login e verificações com Face ID/facial"
            value={settings.facial_recognition_enabled}
            onValueChange={(value) =>
              handleSecurityToggle("facial_recognition_enabled", "Reconhecimento facial", value)
            }
            accentGreen
            colors={colors}
          />
        </View>

        {/* Preferências */}
        <SectionHeader title="PREFERÊNCIAS" colors={colors} />
        <View style={sectionStyle}>
          <ToggleRow
            icon="smartphone"
            label="Vibração"
            sublabel="Feedback tátil nas interações"
            value={settings.haptics_enabled}
            onValueChange={(value) => updateSetting("haptics_enabled", value)}
            colors={colors}
          />
          <View style={[staticStyles.rowDivider, { backgroundColor: colors.surface }]} />
          <LinkRow
            icon="moon"
            label="Tema do app"
            sublabel={`${themeLabels[settings.theme_preference]} — toque para alternar`}
            onPress={() =>
              updateSetting("theme_preference", nextThemePreference[settings.theme_preference])
            }
            colors={colors}
          />
        </View>

        {/* Suporte */}
        <SectionHeader title="SUPORTE" colors={colors} />
        <View style={sectionStyle}>
          <LinkRow
            icon="message-circle"
            label="Central de ajuda"
            sublabel="Tire suas dúvidas"
            onPress={() => {}}
            colors={colors}
          />
          <View style={[staticStyles.rowDivider, { backgroundColor: colors.surface }]} />
          <LinkRow
            icon="lock"
            label="Privacidade e termos"
            onPress={() => {}}
            colors={colors}
          />
          <View style={[staticStyles.rowDivider, { backgroundColor: colors.surface }]} />
          <LinkRow
            icon="star"
            label="Avaliar o Krono"
            sublabel="Sua opinião importa muito"
            onPress={() => {}}
            colors={colors}
          />
        </View>

        {/* Sobre */}
        <SectionHeader title="SOBRE" colors={colors} />
        <View style={[sectionStyle, staticStyles.aboutSection]}>
          <View style={[staticStyles.aboutLogoWrap, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30" }]}>
            <Image
              source={require("@/assets/images/LogoKronoTransparentOrange.png")}
              style={staticStyles.aboutLogoImg}
              resizeMode="contain"
            />
          </View>
          <Text style={[staticStyles.aboutName, { color: colors.text }]}>Krono</Text>
          <Text style={[staticStyles.aboutVersion, { color: colors.textDim }]}>Versão 0.0.1 beta</Text>
          <Text style={[staticStyles.aboutTagline, { color: colors.textDim }]}>Desenvolvido no Brasil</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  backBtn: {
    padding: 4,
  },
  screenLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionHeader: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    height: 1,
    marginLeft: 66,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowTexts: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
  },
  rowSublabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  aboutSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 4,
  },
  aboutLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#e0603015",
    borderWidth: 1.5,
    borderColor: "#e0603030",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  aboutLogoImg: {
    width: 44,
    height: 44,
  },
  aboutName: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
  },
  aboutVersion: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  aboutTagline: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginTop: 4,
  },
});
