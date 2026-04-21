import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/BackButton";
import { CadastroDone } from "@/components/CadastroDone";
import { ToolListCard } from "@/components/ToolListCard";
import { useCatalog, type CatalogTool } from "@/context/CatalogContext";
import { useServices } from "@/context/ServicesContext";
import { useTheme } from "@/context/ThemeContext";
import { GlobalStyles } from "@/constants/globalStyles";
import { supabase } from "@/lib/supabase";
import { TOOL_TYPES, toolIconForTipo, toolLabelForTipo, type FeatherIconName } from "@/constants/catalog-icons";

interface ToolTemplate {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  icon: FeatherIconName;
  description: string;
}

type Step = 1 | 2 | "done";
type Step1Sub = "search" | "new_form";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function mapCatalogTool(tool: CatalogTool): ToolTemplate {
  return {
    id: tool.id,
    name: tool.nome,
    type: tool.tipo,
    typeLabel: toolLabelForTipo(tool.tipo),
    icon: toolIconForTipo(tool.tipo),
    description: tool.description ?? "",
  };
}

export default function CadastroToolScreen() {
  const { colors } = useTheme();
  const { tools: catalogTools, isLoading: catalogLoading } = useCatalog();
  const { refresh } = useServices();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [step, setStep] = useState<Step>(1);
  const [step1Sub, setStep1Sub] = useState<Step1Sub>("search");
  const [toolType, setToolType] = useState("");
  const [toolName, setToolName] = useState("");
  const [query, setQuery] = useState("");
  const [details, setDetails] = useState("");
  const [available, setAvailable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdToolId, setCreatedToolId] = useState<string | null>(null);

  const toolTemplates = React.useMemo(
    () => catalogTools.map(mapCatalogTool),
    [catalogTools]
  );

  const filteredTemplates = query.length > 0
    ? toolTemplates.filter((t) =>
        normalize(t.name).includes(normalize(query)) ||
        normalize(t.typeLabel).includes(normalize(query))
      )
    : toolTemplates;

  const hasExactMatch = query.length > 0 && toolTemplates.some((t) => normalize(t.name) === normalize(query));
  const showCreateOnly = query.length > 1 && filteredTemplates.length === 0;
  const showCreateAtBottom = query.length > 1 && filteredTemplates.length > 0 && !hasExactMatch;

  function handleSelectTemplate(t: ToolTemplate) {
    setToolName(t.name);
    setToolType(t.type);
    setDetails(t.description);
    setStep(2);
  }

  function handleCreateNew() {
    setToolName(query);
    setToolType("");
    setStep1Sub("new_form");
  }

  function handleBack() {
    if (step === 1 && step1Sub === "new_form") {
      setStep1Sub("search");
    } else if (step === 1) {
      router.back();
    } else if (step === 2) {
      setStep(1);
      setStep1Sub("search");
    }
  }

  function handleNewFormNext() {
    if (!toolName.trim() || !toolType) return;
    setStep(2);
  }

  async function handleDetailsNext() {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.from("provider_tools").insert({
        profile_id: user.id,
        nome: toolName.trim(),
        tipo: toolType,
        details: details.trim() || null,
        is_available: available,
      }).select("id").single();

      if (error) throw error;
      if (data?.id) setCreatedToolId(data.id);
      await refresh();
      setStep("done");
    } catch (e) {
      console.warn("[cadastro-tool] save error:", e);
      setSaveError("Não foi possível salvar esta tool. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setStep(1);
    setStep1Sub("search");
    setToolType("");
    setToolName("");
    setQuery("");
    setDetails("");
    setAvailable(true);
    setSaveError(null);
    setCreatedToolId(null);
  }

  if (step === "done") {
    return (
      <CadastroDone
        topPadding={topPadding}
        title="Tool adicionada!"
        subtitle={
          <>
            <Text style={{ color: "#e06030" }}>{toolName}</Text>
            {` foi cadastrada no seu perfil como ${available ? "disponível" : "indisponível"}.`}
          </>
        }
        primaryLabel="Ver tool"
        secondaryAction={{ label: "Adicionar outra tool", icon: "plus", onPress: handleReset }}
        onVerPerfil={() => createdToolId ? router.replace(`/tool/${createdToolId}` as any) : router.back()}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <BackButton onPress={handleBack} />
        <Text style={[styles.headerTitle, { color: colors.textMuted }]}>NOVA TOOL</Text>
      </View>

      {/* STEP 1 — SEARCH */}
      {step === 1 && step1Sub === "search" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.stepTitle, { color: colors.text }]}>Qual é a sua tool?</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            Escolha uma da lista ou escreva o nome do equipamento, ferramenta ou veículo que você usa.
          </Text>

          <View style={[GlobalStyles.inputWrap, { backgroundColor: colors.inputBg, borderColor: query.length > 0 ? "#e0603050" : colors.inputBorder }]}>
            <Feather name="search" size={15} color={query.length > 0 ? "#e06030" : colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar tool..."
              placeholderTextColor={colors.textDim}
              autoCapitalize="words"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Feather name="x" size={15} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {catalogLoading ? (
            <ActivityIndicator color="#e06030" style={{ marginTop: 32 }} />
          ) : (
            <>
              {showCreateOnly && (
                <Pressable
                  style={[styles.createOptionCard, { backgroundColor: colors.card, borderColor: "#e06030" }]}
                  onPress={handleCreateNew}
                >
                  <View style={[styles.createOptionIcon, { backgroundColor: "#e0603020" }]}>
                    <Feather name="plus" size={18} color="#e06030" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.createOptionLabel}>Criar tool</Text>
                    <Text style={[styles.createOptionName, { color: colors.text }]} numberOfLines={1}>"{query}"</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#e06030" />
                </Pressable>
              )}

              {query.length === 0 && (
                <Text style={[styles.listLabel, { color: colors.textMuted }]}>SUGESTÕES POPULARES</Text>
              )}
              {query.length > 0 && filteredTemplates.length > 0 && (
                <Text style={[styles.listLabel, { color: colors.textMuted }]}>
                  {filteredTemplates.length} RESULTADO{filteredTemplates.length !== 1 ? "S" : ""}
                </Text>
              )}

              <View style={styles.templateList}>
                {filteredTemplates.map((t) => (
                  <ToolListCard
                    key={t.id}
                    name={t.name}
                    iconName={t.icon}
                    description={t.description}
                    badge={t.typeLabel}
                    onPress={() => handleSelectTemplate(t)}
                  />
                ))}

                {showCreateAtBottom && (
                  <Pressable
                    style={[styles.createOptionCardSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={handleCreateNew}
                  >
                    <Feather name="plus-circle" size={14} color="#e06030" />
                    <Text style={[styles.createOptionSmallText, { color: colors.textSecondary }]}>
                      Criar "<Text style={{ color: "#e06030" }}>{query}</Text>" como nova tool
                    </Text>
                    <Feather name="chevron-right" size={14} color={colors.chevron} />
                  </Pressable>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* STEP 1 — NEW TOOL FORM (name + type picker) */}
      {step === 1 && step1Sub === "new_form" && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.stepTitle, { color: colors.text }]}>Nova tool</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              Confirme o nome e selecione o tipo da tool.
            </Text>

            <View style={[GlobalStyles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={toolName}
                onChangeText={setToolName}
                placeholder="Nome da tool..."
                placeholderTextColor={colors.textDim}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TIPO</Text>
            <View style={styles.typeList}>
              {TOOL_TYPES.map((t) => {
                const selected = toolType === t.id;
                return (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.typeRow,
                      {
                        backgroundColor: selected ? "#e0603010" : colors.card,
                        borderColor: selected ? "#e0603050" : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setToolType(t.id)}
                  >
                    <View style={[styles.typeIconWrap, { backgroundColor: selected ? "#e0603020" : colors.surface }]}>
                      <Feather name={t.icon} size={16} color={selected ? "#e06030" : colors.textMuted} />
                    </View>
                    <Text style={[styles.typeLabel, { color: selected ? colors.text : colors.textSecondary }]}>
                      {t.label}
                    </Text>
                    {selected && <Feather name="check" size={16} color="#e06030" />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable
              style={[GlobalStyles.primaryBtn, { flex: 1 }, (!toolName.trim() || !toolType) && styles.primaryBtnDisabled]}
              onPress={handleNewFormNext}
              disabled={!toolName.trim() || !toolType}
            >
              <Text style={styles.primaryBtnText}>Próximo</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* STEP 2 — DETAILS + AVAILABILITY */}
      {step === 2 && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.nameCard, { backgroundColor: colors.card, borderColor: "#e0603030" }]}>
              <Text style={[styles.nameCardLabel, { color: colors.textMuted }]}>TOOL</Text>
              <Text style={[styles.nameCardValue, { color: colors.text }]}>{toolName}</Text>
            </View>

            <Text style={[styles.stepTitle, { color: colors.text }]}>Detalhes</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              Adicione informações extras sobre{" "}
              <Text style={{ color: "#e06030" }}>{toolName}</Text> e defina a disponibilidade.
            </Text>

            <TextInput
              style={[styles.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={details}
              onChangeText={setDetails}
              placeholder="Ex: cor, capacidade, modelo, ano, condição..."
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={[styles.availCard, { backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.availTitle, { color: colors.text }]}>Disponível agora</Text>
                <Text style={[styles.availSub, { color: colors.textMuted }]}>
                  {available ? "Esta tool aparecerá como disponível no perfil." : "Esta tool aparecerá como indisponível."}
                </Text>
              </View>
              <Switch
                value={available}
                onValueChange={setAvailable}
                trackColor={{ false: colors.surfaceBorder, true: "#e0603060" }}
                thumbColor={available ? "#e06030" : colors.textMuted}
              />
            </View>

            {saveError && <Text style={styles.errorText}>{saveError}</Text>}
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable style={[styles.skipBtn, { borderColor: colors.inputBorder }, isSaving && styles.primaryBtnDisabled]} onPress={handleDetailsNext} disabled={isSaving}>
              <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>pular</Text>
            </Pressable>
            <Pressable style={[GlobalStyles.primaryBtn, { flex: 1 }, isSaving && styles.primaryBtnDisabled]} onPress={handleDetailsNext} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Concluir</Text>}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontFamily: "DMSans_400Regular", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  content: { paddingHorizontal: 20 },
  stepTitle: { fontFamily: "Sora_700Bold", fontSize: 22, marginBottom: 8 },
  stepSub: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 24 },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontFamily: "Sora_400Regular", fontSize: 14 },
  listLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  templateList: { gap: 10 },
  createOptionCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  createOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  createOptionLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#e06030", marginBottom: 2 },
  createOptionName: { fontFamily: "Sora_700Bold", fontSize: 16 },
  createOptionCardSmall: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  createOptionSmallText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12 },
  fieldLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  typeList: { gap: 8, marginBottom: 24 },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14 },
  typeIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  typeLabel: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 14 },
  nameCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 20 },
  nameCardLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  nameCardValue: { fontFamily: "Sora_700Bold", fontSize: 20 },
  textarea: { borderWidth: 1, borderRadius: 14, padding: 16, fontFamily: "Sora_400Regular", fontSize: 14, minHeight: 120, lineHeight: 22, marginBottom: 16 },
  availCard: { borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 16 },
  availTitle: { fontFamily: "Sora_600SemiBold", fontSize: 14, marginBottom: 3 },
  availSub: { fontFamily: "DMSans_400Regular", fontSize: 10, lineHeight: 15 },
  errorText: { color: "#e06030", fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 17, marginTop: 12 },
  bottomBar: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontFamily: "Sora_700Bold", fontSize: 14, color: "#fff" },
});
