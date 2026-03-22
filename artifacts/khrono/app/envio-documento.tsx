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

import Colors from "@/constants/colors";
import { DocFile, DocType, useDocuments } from "@/context/DocumentsContext";

type DocConfig = {
  label: string;
  instructions: string[];
  requiresBack: boolean;
};

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
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={Colors.accent} />
          </Pressable>
          <Text style={styles.headerTitle}>Enviar documento</Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Tipo de documento — chips horizontais */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TIPO DE DOCUMENTO</Text>
          <View style={styles.chipRow}>
            {DOC_TYPES.map((type) => {
              const active = selectedType === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => { setSelectedType(type); setFiles([]); }}
                >
                  {active && (
                    <View style={styles.chipDot} />
                  )}
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Arquivos adicionados */}
        {files.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              ARQUIVOS ADICIONADOS · {files.length}
            </Text>
            <View style={styles.fileList}>
              {files.map((file, index) => (
                <View key={index} style={styles.fileItem}>
                  <View style={styles.fileIconWrap}>
                    <Feather name={getFileIcon(file.mimeType)} size={15} color={Colors.accent} />
                  </View>
                  <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                    {file.name}
                  </Text>
                  <Pressable
                    style={styles.fileRemoveBtn}
                    onPress={() => removeFile(index)}
                    hitSlop={10}
                  >
                    <Feather name="x" size={13} color="#444" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Adicionar arquivos */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADICIONAR ARQUIVOS</Text>
          <Pressable style={styles.addBtn} onPress={pickFile}>
            <View style={styles.addBtnIcon}>
              <Feather name="paperclip" size={18} color="#666" />
            </View>
            <View style={styles.addBtnTexts}>
              <Text style={styles.addBtnLabel}>Selecionar arquivo</Text>
              <Text style={styles.addBtnSub}>Imagem ou PDF do dispositivo</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#2a2a2a" />
          </Pressable>
        </View>

        {/* Instruções — no final */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INSTRUÇÕES — {selectedType}</Text>
          <View style={styles.instructionsCard}>
            {config.instructions.map((inst, i) => (
              <View key={i} style={styles.instructionRow}>
                <View style={styles.instructionDot} />
                <Text style={styles.instructionText}>{inst}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Botão de envio fixo */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
    color: "#fff",
  },

  section: { marginBottom: 24 },
  sectionLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    backgroundColor: "#0a0a0a",
  },
  chipActive: {
    borderColor: Colors.accent + "60",
    backgroundColor: Colors.accent + "10",
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  chipLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#444",
  },
  chipLabelActive: {
    color: "#fff",
  },

  fileList: { gap: 6 },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  fileIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.accent + "10",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileName: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#888",
    flex: 1,
  },
  fileRemoveBtn: {
    padding: 4,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 14,
  },
  addBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addBtnTexts: {
    flex: 1,
    gap: 2,
  },
  addBtnLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#ccc",
  },
  addBtnSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
  },

  instructionsCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  instructionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginTop: 6,
    flexShrink: 0,
  },
  instructionText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    flex: 1,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#111",
    backgroundColor: Colors.background,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
