import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

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

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ToggleRow({ icon, label, sublabel, value, onValueChange, accentGreen }: ToggleRowProps) {
  const color = accentGreen ? Colors.accentGreen : Colors.accent;
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: color + "12", borderColor: color + "25" }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#1e1e1e", true: color + "55" }}
        thumbColor={value ? color : "#333"}
        ios_backgroundColor="#1e1e1e"
      />
    </View>
  );
}

function LinkRow({ icon, label, sublabel, onPress, danger }: LinkRowProps) {
  const color = danger ? "#ff3b30" : "#555";
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconWrap,
          danger
            ? { backgroundColor: "#ff3b3012", borderColor: "#ff3b3025" }
            : { backgroundColor: "#161616", borderColor: "#1e1e1e" },
        ]}
      >
        <Feather name={icon} size={15} color={color} />
      </View>
      <View style={styles.rowTexts}>
        <Text style={[styles.rowLabel, danger && { color: "#ff3b30" }]}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      {!danger && <Feather name="chevron-right" size={14} color="#2a2a2a" />}
    </Pressable>
  );
}

export default function DefinicoesScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [notifPush, setNotifPush] = useState(true);
  const [notifContratos, setNotifContratos] = useState(true);
  const [notifAgenda, setNotifAgenda] = useState(false);
  const [biometria, setBiometria] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const [modoEscuro, setModoEscuro] = useState(true);

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={Colors.accent} />
          </Pressable>
          <Text style={styles.screenLabel}>definições</Text>
        </View>

        {/* Notificações */}
        <SectionHeader title="NOTIFICAÇÕES" />
        <View style={styles.section}>
          <ToggleRow
            icon="bell"
            label="Notificações push"
            sublabel="Receber alertas no dispositivo"
            value={notifPush}
            onValueChange={setNotifPush}
          />
          <View style={styles.rowDivider} />
          <ToggleRow
            icon="file-text"
            label="Novos contratos"
            sublabel="Quando alguém te contratar"
            value={notifContratos}
            onValueChange={setNotifContratos}
          />
          <View style={styles.rowDivider} />
          <ToggleRow
            icon="calendar"
            label="Lembretes de agenda"
            sublabel="Antes de um serviço agendado iniciar"
            value={notifAgenda}
            onValueChange={setNotifAgenda}
          />
        </View>

        {/* Segurança */}
        <SectionHeader title="SEGURANÇA" />
        <View style={styles.section}>
          <ToggleRow
            icon="shield"
            label="Autenticação biométrica"
            sublabel="Usar impressão digital ou Face ID"
            value={biometria}
            onValueChange={setBiometria}
            accentGreen
          />
        </View>

        {/* Preferências */}
        <SectionHeader title="PREFERÊNCIAS" />
        <View style={styles.section}>
          <ToggleRow
            icon="smartphone"
            label="Vibração"
            sublabel="Feedback tátil nas interações"
            value={haptics}
            onValueChange={setHaptics}
          />
          <View style={styles.rowDivider} />
          <ToggleRow
            icon="moon"
            label="Tema escuro"
            sublabel="Sempre ativo nesta versão"
            value={modoEscuro}
            onValueChange={() => {}}
            accentGreen
          />
        </View>

        {/* Suporte */}
        <SectionHeader title="SUPORTE" />
        <View style={styles.section}>
          <LinkRow
            icon="message-circle"
            label="Central de ajuda"
            sublabel="Tire suas dúvidas"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <LinkRow
            icon="lock"
            label="Privacidade e termos"
            onPress={() => {}}
          />
          <View style={styles.rowDivider} />
          <LinkRow
            icon="star"
            label="Avaliar o Khrono"
            sublabel="Sua opinião importa muito"
            onPress={() => {}}
          />
        </View>

        {/* Sobre */}
        <SectionHeader title="SOBRE" />
        <View style={[styles.section, styles.aboutSection]}>
          <View style={styles.aboutLogoWrap}>
            <Text style={styles.aboutLogo}>K</Text>
          </View>
          <Text style={styles.aboutName}>Khrono</Text>
          <Text style={styles.aboutVersion}>Versão 1.0.0</Text>
          <Text style={styles.aboutTagline}>Desenvolvido no Brasil</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionHeader: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#333",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: {
    backgroundColor: "#111",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#111",
    marginLeft: 66,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
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
    color: "#d0d0d0",
  },
  rowSublabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    marginTop: 2,
    lineHeight: 14,
  },
  aboutSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 4,
  },
  aboutLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: Colors.accent + "15",
    borderWidth: 1.5,
    borderColor: Colors.accent + "30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  aboutLogo: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: Colors.accent,
  },
  aboutName: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  aboutVersion: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
    marginTop: 2,
  },
  aboutTagline: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#222",
    marginTop: 4,
  },
});
