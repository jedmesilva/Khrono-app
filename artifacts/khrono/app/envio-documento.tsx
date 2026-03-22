import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
  const [picking, setPicking] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!picking) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [picking, pulseAnim]);

  const config = DOC_CONFIG[selectedType];

  async function pickFromGallery() {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.9,
      });

      if (!result.canceled) {
        const newFiles: DocFile[] = result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName ?? `imagem_${Date.now()}.jpg`,
          mimeType: a.mimeType ?? "image/jpeg",
        }));
        setFiles((prev) => [...prev, ...newFiles]);
      }
    } finally {
      setPicking(false);
    }
  }

  async function pickDocument() {
    setPicking(true);
    try {
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
    } finally {
      setPicking(false);
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
          { paddingTop: topPadding + 16, paddingBottom: 100 },
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

        {/* Tipo de documento */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TIPO DE DOCUMENTO</Text>
          <View style={styles.typeList}>
            {DOC_TYPES.map((type) => {
              const active = selectedType === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  onPress={() => { setSelectedType(type); setFiles([]); }}
                >
                  <View style={[styles.typeCardDot, active && styles.typeCardDotActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeCardLabel, active && styles.typeCardLabelActive]}>
                      {type}
                    </Text>
                    {type === "RG" && (
                      <Text style={styles.typeCardSub}>Frente e verso</Text>
                    )}
                  </View>
                  {active && (
                    <Feather name="check" size={14} color={Colors.accent} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Instruções */}
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

        {/* Skeleton de carregamento */}
        {picking && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PROCESSANDO ARQUIVOS</Text>
            <View style={styles.fileList}>
              {[1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[styles.fileItem, styles.skeletonItem, { opacity: pulseAnim }]}
                >
                  <View style={[styles.fileIcon, styles.skeletonBlock]} />
                  <View style={styles.skeletonLines}>
                    <View style={[styles.skeletonLine, { width: "65%" }]} />
                    <View style={[styles.skeletonLine, { width: "40%", marginTop: 6 }]} />
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Arquivos adicionados */}
        {!picking && files.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ARQUIVOS ADICIONADOS</Text>
            <View style={styles.fileList}>
              {files.map((file, index) => (
                <View key={index} style={styles.fileItem}>
                  <View style={styles.fileIcon}>
                    <Feather name={getFileIcon(file.mimeType)} size={16} color="#555" />
                  </View>
                  <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                    {file.name}
                  </Text>
                  <Pressable style={styles.fileRemoveBtn} onPress={() => removeFile(index)} hitSlop={8}>
                    <Feather name="x" size={14} color="#444" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Botões de upload */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADICIONAR ARQUIVOS</Text>
          <Text style={styles.uploadHint}>
            Aceitos: imagens (JPG, PNG) e documentos PDF
          </Text>
          <View style={styles.uploadBtns}>
            <Pressable
              style={[styles.uploadBtn, picking && styles.uploadBtnDisabled]}
              onPress={pickFromGallery}
              disabled={picking}
            >
              <Feather name="image" size={20} color={picking ? "#333" : "#555"} />
              <Text style={[styles.uploadBtnLabel, picking && { color: "#333" }]}>Galeria</Text>
              <Text style={styles.uploadBtnSub}>JPG, PNG</Text>
            </Pressable>
            <Pressable
              style={[styles.uploadBtn, picking && styles.uploadBtnDisabled]}
              onPress={pickDocument}
              disabled={picking}
            >
              <Feather name="file-text" size={20} color={picking ? "#333" : "#555"} />
              <Text style={[styles.uploadBtnLabel, picking && { color: "#333" }]}>Arquivos</Text>
              <Text style={styles.uploadBtnSub}>PDF, imagens</Text>
            </Pressable>
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
            {submitting ? "Enviando..." : `Enviar para análise${files.length > 0 ? ` · ${files.length} arquivo${files.length !== 1 ? "s" : ""}` : ""}`}
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

  typeList: { gap: 8 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typeCardActive: {
    borderColor: Colors.accent + "50",
    backgroundColor: Colors.accent + "08",
  },
  typeCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#333",
  },
  typeCardDotActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  typeCardLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#555",
  },
  typeCardLabelActive: {
    color: "#fff",
  },
  typeCardSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    marginTop: 2,
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

  fileList: { gap: 8 },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
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

  skeletonItem: {
    backgroundColor: "#0d0d0d",
    borderColor: "#161616",
  },
  skeletonBlock: {
    backgroundColor: "#1a1a1a",
    borderColor: "#222",
  },
  skeletonLines: {
    flex: 1,
    justifyContent: "center",
  },
  skeletonLine: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#1e1e1e",
  },
  uploadBtnDisabled: {
    opacity: 0.35,
  },

  uploadHint: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
    marginBottom: 12,
  },
  uploadBtns: {
    flexDirection: "row",
    gap: 10,
  },
  uploadBtn: {
    flex: 1,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0a0a0a",
    borderStyle: "dashed",
  },
  uploadBtnLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#555",
  },
  uploadBtnSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
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
