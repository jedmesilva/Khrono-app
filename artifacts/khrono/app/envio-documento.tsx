import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { DocFile, DocType, useDocuments } from "@/context/DocumentsContext";

type DocConfig = { label: string; instructions: string[]; requiresBack: boolean };

const DOC_CONFIG: Record<DocType, DocConfig> = {
  RG: {
    label: "RG — Registro Geral",
    instructions: [
      "Envie frente e verso do documento",
      "O documento deve estar dentro da validade",
      "Imagem nítida, sem reflexos ou sombras",
      "Todos os dados devem estar legíveis",
    ],
    requiresBack: true,
  },
  CNH: {
    label: "CNH — Carteira Nacional de Habilitação",
    instructions: [
      "Envie a frente da CNH (lado com foto)",
      "A CNH deve estar dentro da validade",
      "Imagem nítida, sem reflexos ou sombras",
      "Todos os dados devem estar legíveis",
    ],
    requiresBack: false,
  },
  Passaporte: {
    label: "Passaporte",
    instructions: [
      "Envie a página com foto e dados pessoais",
      "O passaporte deve estar dentro da validade",
      "Imagem nítida, sem reflexos ou sombras",
      "Todos os dados devem estar legíveis",
    ],
    requiresBack: false,
  },
};

const DOC_TYPES: DocType[] = ["RG", "CNH", "Passaporte"];

export default function EnvioDocumentoScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const { addDocument } = useDocuments();
  const [selectedType, setSelectedType] = useState<DocType>("RG");
  const [files, setFiles] = useState<DocFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const config = DOC_CONFIG[selectedType];

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      const newFiles: DocFile[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType ?? "application/octet-stream",
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (files.length === 0) {
      Alert.alert("Nenhum arquivo", "Adicione ao menos um arquivo antes de enviar.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      addDocument({ type: selectedType, status: "analise", files });
      setSubmitting(false);
      router.back();
    }, 800);
  }

  function getFileIcon(mimeType: string): "file-text" | "image" {
    if (mimeType.startsWith("image/")) return "image";
    return "file-text";
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#ff6b35" />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Enviar documento</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TIPO DE DOCUMENTO</Text>
          <View style={styles.chipRow}>
            {DOC_TYPES.map((type) => {
              const active = selectedType === type;
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.chip,
                    { borderColor: colors.inputBorder, backgroundColor: colors.inputBg },
                    active && styles.chipActive,
                  ]}
                  onPress={() => { setSelectedType(type); setFiles([]); }}
                >
                  {active && <View style={styles.chipDot} />}
                  <Text style={[styles.chipLabel, { color: colors.textSecondary }, active && styles.chipLabelActive]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {files.length > 0 ? `ARQUIVOS · ${files.length}` : "ARQUIVOS"}
          </Text>
          <View style={[styles.filesSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {files.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileIconWrap}>
                  <Feather name={getFileIcon(file.mimeType)} size={15} color="#ff6b35" />
                </View>
                <Text style={[styles.fileName, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="middle">
                  {file.name}
                </Text>
                <Pressable style={styles.fileRemoveBtn} onPress={() => removeFile(index)} hitSlop={10}>
                  <Feather name="x" size={13} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
            {files.length > 0 && <View style={[styles.filesDivider, { backgroundColor: colors.surface }]} />}
            <Pressable style={styles.addBtn} onPress={pickFile}>
              <View style={[styles.addBtnIcon, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Feather name="paperclip" size={18} color={colors.textSecondary} />
              </View>
              <View style={styles.addBtnTexts}>
                <Text style={[styles.addBtnLabel, { color: colors.textSecondary }]}>
                  {files.length > 0 ? "Adicionar mais arquivos" : "Selecionar arquivo"}
                </Text>
                <Text style={[styles.addBtnSub, { color: colors.textMuted }]}>Imagem ou PDF do dispositivo</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textDim} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>INSTRUÇÕES — {selectedType}</Text>
          <View style={[styles.instructionsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {config.instructions.map((inst, i) => (
              <View key={i} style={styles.instructionRow}>
                <View style={styles.instructionDot} />
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>{inst}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.surface }]}>
        <Pressable
          style={[styles.submitBtn, (files.length === 0 || submitting) && styles.submitBtnDisabled]}
          disabled={files.length === 0 || submitting}
          onPress={handleSubmit}
        >
          <Feather name={submitting ? "loader" : "upload"} size={16} color="#fff" />
          <Text style={styles.submitBtnText}>
            {submitting
              ? "Enviando..."
              : files.length > 0
                ? `Enviar para análise · ${files.length} arquivo${files.length !== 1 ? "s" : ""}`
                : "Enviar para análise"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Sora_700Bold", fontSize: 16 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.4,
    textTransform: "uppercase", marginBottom: 12,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  chipActive: { borderColor: "#ff6b3560", backgroundColor: "#ff6b3510" },
  chipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#ff6b35" },
  chipLabel: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  chipLabelActive: { color: "#fff" },
  filesSection: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  fileItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  fileIconWrap: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: "#ff6b3510",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  fileName: { fontFamily: "DMMono_400Regular", fontSize: 12, flex: 1 },
  fileRemoveBtn: { padding: 4 },
  filesDivider: { height: 1, marginHorizontal: 14 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  addBtnIcon: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  addBtnTexts: { flex: 1, gap: 2 },
  addBtnLabel: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  addBtnSub: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  instructionsCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  instructionDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: "#ff6b35", marginTop: 6, flexShrink: 0,
  },
  instructionText: { fontFamily: "DMMono_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#ff6b35", borderRadius: 14, paddingVertical: 15,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 14, color: "#fff" },
});
