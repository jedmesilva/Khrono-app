import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CadastroDone } from "@/components/CadastroDone";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useTheme } from "@/context/ThemeContext";
import { type Skill, type Tool, type VerificationType } from "@/constants/profile-data";
import { useCatalog, type CatalogService } from "@/context/CatalogContext";
import { useUserCatalog } from "@/context/UserCatalogContext";
import { useServices, formatMonthYear } from "@/context/ServicesContext";
import { supabase } from "@/lib/supabase";

const DRAFT_KEY = "@khrono/service_draft";

type Step = 1 | 2 | 3 | 4 | "done";
type Step1Sub = "search" | "new_form";

interface Draft {
  step: Step;
  step1Sub: Step1Sub;
  mode: "predefined" | "custom" | null;
  serviceName: string;
  serviceDescription: string;
  selectedServiceId: string | null;
  requiredSkillName: string | null;
  requiredToolNames: string[];
  selectedSkillIds: string[];
  selectedToolIds: string[];
  hourlyRateInput: string;
}

const EMPTY_DRAFT: Draft = {
  step: 1,
  step1Sub: "search",
  mode: null,
  serviceName: "",
  serviceDescription: "",
  selectedServiceId: null,
  requiredSkillName: null,
  requiredToolNames: [],
  selectedSkillIds: [],
  selectedToolIds: [],
  hourlyRateInput: "",
};

const TOTAL_STEPS = 4;

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function CadastroServiceScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [draft, setDraftState] = useState<Draft>(EMPTY_DRAFT);
  const [query, setQuery] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);

  const setDraft = useCallback((updater: Partial<Draft> | ((prev: Draft) => Draft)) => {
    setDraftState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (raw) {
        try {
          const saved: Draft = JSON.parse(raw);
          setDraftState(saved);
          if (saved.step1Sub === "search" && saved.serviceName) {
            setQuery(saved.serviceName);
          }
        } catch (_) {}
      }
      setDraftLoaded(true);
    });
  }, []);

  function clearDraft() {
    setDraftState(EMPTY_DRAFT);
    setQuery("");
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }

  const { services: catalogServices, isLoading: catalogLoading } = useCatalog();
  const { userSkills: rawUserSkills } = useUserCatalog();
  const { myTools, providerProfile, refresh } = useServices();
  const [isSaving, setIsSaving] = useState(false);

  const userSkills: Skill[] = useMemo(
    () =>
      rawUserSkills.map((entry) => ({
        id: entry.skill_id,
        name: entry.skill?.nome ?? "",
        type: entry.skill?.category ?? "",
        description: entry.skill?.description ?? "",
        verified: entry.skill?.verified
          ? ({ type: "documentation" } as { type: VerificationType })
          : null,
        isNew: false,
        addedAt: formatMonthYear(entry.createdAt),
      })),
    [rawUserSkills]
  );

  const userTools: Tool[] = myTools;

  const filteredTemplates = query.length > 0
    ? catalogServices.filter((t) => normalize(t.nome).includes(normalize(query)) || normalize(t.category ?? "").includes(normalize(query)))
    : catalogServices;

  const hasExactMatch = query.length > 0 && catalogServices.some((t) => normalize(t.nome) === normalize(query));
  const showCreateOption = query.length > 1 && filteredTemplates.length === 0;
  const showCreateOptionAtBottom = query.length > 1 && filteredTemplates.length > 0 && !hasExactMatch;

  function handleSelectTemplate(template: CatalogService) {
    setDraft({
      step: 2,
      step1Sub: "search",
      mode: "predefined",
      serviceName: template.nome,
      serviceDescription: template.description ?? "",
      selectedServiceId: template.id,
      requiredSkillName: null,
      requiredToolNames: [],
      selectedSkillIds: [],
      selectedToolIds: [],
    });
  }

  function handleCreateNew() {
    setDraft({
      step: 1,
      step1Sub: "new_form",
      mode: "custom",
      serviceName: query,
      serviceDescription: "",
      selectedServiceId: null,
      requiredSkillName: null,
      requiredToolNames: [],
      selectedSkillIds: [],
      selectedToolIds: [],
    });
  }

  function handleNewFormNext() {
    if (!draft.serviceName.trim()) return;
    setDraft({ step: 2 });
  }

  function toggleSkill(skillId: string) {
    setDraft((prev) => ({
      ...prev,
      selectedSkillIds: prev.selectedSkillIds.includes(skillId)
        ? prev.selectedSkillIds.filter((id) => id !== skillId)
        : [...prev.selectedSkillIds, skillId],
    }));
  }

  function toggleTool(toolId: string) {
    setDraft((prev) => ({
      ...prev,
      selectedToolIds: prev.selectedToolIds.includes(toolId)
        ? prev.selectedToolIds.filter((id) => id !== toolId)
        : [...prev.selectedToolIds, toolId],
    }));
  }

  function handleBack() {
    if (draft.step === 1 && draft.step1Sub === "new_form") {
      setDraft({ step1Sub: "search" });
    } else if (draft.step === 1) {
      clearDraft();
      router.back();
    } else if (draft.step === 2) {
      setDraft({ step: 1, step1Sub: "search" });
    } else if (draft.step === 3) {
      setDraft({ step: 2 });
    } else if (draft.step === 4) {
      setDraft({ step: 3 });
    }
  }

  function handleSkillsNext() {
    setDraft({ step: 3 });
  }

  function handleToolsNext() {
    setDraft({ step: 4 });
  }

  async function handleHourlyRateNext() {
    const finalName = draft.serviceName;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const hourlyRate = Number(draft.hourlyRateInput) || 50;
      const valorBase = providerProfile?.valorBase ?? 50;
      const multiplicador = (hourlyRate / valorBase).toFixed(3);

      const firstSkill = draft.selectedSkillIds.length > 0
        ? (userSkills.find((s) => s.id === draft.selectedSkillIds[0])?.name ?? null)
        : null;

      const toolsData = draft.selectedToolIds
        .map((tid) => userTools.find((t) => t.id === tid))
        .filter(Boolean)
        .map((t) => ({ nome: t!.name, tipo: t!.type }));

      await supabase.from("provider_services").insert({
        profile_id: user.id,
        nome: draft.serviceName.trim(),
        multiplicador,
        skill: firstSkill,
        tools: toolsData,
        is_active: true,
      });

      await refresh();
    } catch (e) {
      console.warn("[cadastro-service] save error:", e);
    } finally {
      setIsSaving(false);
      setDraftState({ ...EMPTY_DRAFT, step: "done", serviceName: finalName });
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    }
  }

  function handleHourlyRateInput(text: string) {
    const cleaned = text.replace(/[^0-9]/g, "");
    setDraft({ hourlyRateInput: cleaned });
  }

  const currentStep = draft.step === "done" ? TOTAL_STEPS : (draft.step as number);
  const progress = Math.min(currentStep / TOTAL_STEPS, 1);

  if (!draftLoaded) return null;

  if (draft.step === "done") {
    return (
      <CadastroDone
        topPadding={topPadding}
        title="Service criado!"
        subtitle={
          <>
            <Text style={{ color: "#e06030" }}>{draft.serviceName}</Text>
            {" foi adicionado ao seu perfil."}
          </>
        }
        secondaryAction={{ label: "Criar outro service", icon: "plus", onPress: clearDraft }}
        onVerPerfil={() => { clearDraft(); router.back(); }}
      />
    );
  }

  const requiredSkill = draft.requiredSkillName
    ? userSkills.find((s) => normalize(s.name) === normalize(draft.requiredSkillName!))
    : null;
  const userHasRequiredSkill = draft.mode === "predefined" && draft.requiredSkillName
    ? !!requiredSkill
    : true;

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Feather name="arrow-left" size={18} color="#e06030" />
        </Pressable>
        <View style={{ flex: 1 }}>
          {draft.step !== 1 || draft.step1Sub === "new_form" ? (
            <>
              <Text style={[styles.stepIndicator, { color: colors.textMuted }]}>
                Passo {currentStep} de {TOTAL_STEPS}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
            </>
          ) : (
            <Text style={[styles.stepIndicator, { color: colors.textMuted }]}>NOVO SERVICE</Text>
          )}
        </View>
        {draft.step !== 1 && (
          <View style={[styles.draftBadge, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Feather name="save" size={10} color={colors.textMuted} />
            <Text style={[styles.draftBadgeText, { color: colors.textMuted }]}>rascunho</Text>
          </View>
        )}
      </View>

      {/* STEP 1 — SEARCH */}
      {draft.step === 1 && draft.step1Sub === "search" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.stepTitle, { color: colors.text }]}>Qual é o seu service?</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            Escolha um da lista ou escreva o nome do que você oferece.
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: query.length > 0 ? "#e0603050" : colors.inputBorder }]}>
            <Feather name="search" size={15} color={query.length > 0 ? "#e06030" : colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={query}
              onChangeText={(t) => { setQuery(t); }}
              placeholder="Buscar service..."
              placeholderTextColor={colors.textDim}
              autoCapitalize="words"
              autoFocus={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Feather name="x" size={15} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {showCreateOption && (
            <Pressable
              style={[styles.createOptionCard, { backgroundColor: colors.card, borderColor: "#e06030" }]}
              onPress={handleCreateNew}
            >
              <View style={[styles.createOptionIcon, { backgroundColor: "#e0603020", borderColor: "#e0603040" }]}>
                <Feather name="plus" size={18} color="#e06030" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createOptionLabel}>Criar serviço</Text>
                <Text style={[styles.createOptionName, { color: colors.text }]} numberOfLines={1}>"{query}"</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#e06030" />
            </Pressable>
          )}

          {query.length === 0 && (
            <Text style={[styles.listLabel, { color: colors.textMuted }]}>SUGESTÕES POPULARES</Text>
          )}
          {query.length > 0 && filteredTemplates.length > 0 && (
            <Text style={[styles.listLabel, { color: colors.textMuted }]}>{filteredTemplates.length} RESULTADO{filteredTemplates.length !== 1 ? "S" : ""}</Text>
          )}

          {catalogLoading ? (
            <ActivityIndicator color="#e06030" style={{ marginTop: 32 }} />
          ) : null}

          <View style={styles.templateList}>
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                colors={colors}
                onPress={() => handleSelectTemplate(template)}
              />
            ))}

            {showCreateOptionAtBottom && (
              <Pressable
                style={[styles.createOptionCardSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={handleCreateNew}
              >
                <Feather name="plus-circle" size={14} color="#e06030" />
                <Text style={[styles.createOptionSmallText, { color: colors.textSecondary }]}>
                  Criar "<Text style={{ color: "#e06030" }}>{query}</Text>" como novo service
                </Text>
                <Feather name="chevron-right" size={14} color={colors.chevron} />
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}

      {/* STEP 1 — NEW SERVICE FORM */}
      {draft.step === 1 && draft.step1Sub === "new_form" && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.stepTitle, { color: colors.text }]}>Novo service</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              Dê uma descrição para que os clientes entendam o que você oferece.
            </Text>

            <View style={[styles.nameCard, { backgroundColor: colors.card, borderColor: "#e0603030" }]}>
              <Text style={[styles.nameCardLabel, { color: colors.textMuted }]}>NOME DO SERVICE</Text>
              <Text style={[styles.nameCardValue, { color: colors.text }]}>{draft.serviceName}</Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DESCRIÇÃO <Text style={{ color: colors.textDim }}>(opcional)</Text></Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={draft.serviceDescription}
              onChangeText={(t) => setDraft({ serviceDescription: t })}
              placeholder="Ex: realizo pinturas internas e externas, com material incluso e acabamento de qualidade..."
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }, !draft.serviceName.trim() && styles.primaryBtnDisabled]}
              onPress={handleNewFormNext}
              disabled={!draft.serviceName.trim()}
            >
              <Text style={styles.primaryBtnText}>Próximo</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* STEP 2 — SKILLS */}
      {draft.step === 2 && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.serviceNamePill, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.serviceNamePillText, { color: colors.text }]} numberOfLines={1}>{draft.serviceName}</Text>
            </View>

            <Text style={[styles.stepTitle, { color: colors.text }]}>Skills</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              {draft.mode === "predefined" && draft.requiredSkillName
                ? `Este service normalmente inclui a skill "${draft.requiredSkillName}". Você pode selecionar mais de uma.`
                : "Selecione as skills que compõem este service. Você pode escolher mais de uma ou deixar em branco."}
            </Text>

            {/* Required skill warning for predefined */}
            {draft.mode === "predefined" && draft.requiredSkillName && !userHasRequiredSkill && (
              <View style={[styles.warningCard, { backgroundColor: "#e0603010", borderColor: "#e0603030" }]}>
                <Feather name="alert-circle" size={16} color="#e06030" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.warningTitle, { color: "#e06030" }]}>Skill não encontrada</Text>
                  <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                    Você não tem a skill "{draft.requiredSkillName}" cadastrada. Cadastre-a para completar a composição ideal.
                  </Text>
                  <Pressable
                    style={styles.warningAction}
                    onPress={() => router.push("/cadastro-skill")}
                  >
                    <Text style={styles.warningActionText}>Criar skill</Text>
                    <Feather name="arrow-right" size={12} color="#e06030" />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Skill list */}
            <View style={styles.selectionList}>
              {userSkills.map((skill) => {
                const isSelected = draft.selectedSkillIds.includes(skill.id);
                const isRecommended = draft.requiredSkillName
                  ? normalize(skill.name) === normalize(draft.requiredSkillName)
                  : false;
                return (
                  <SelectableSkillCard
                    key={skill.id}
                    skill={skill}
                    selected={isSelected}
                    recommended={isRecommended}
                    colors={colors}
                    onPress={() => toggleSkill(skill.id)}
                  />
                );
              })}

              <Pressable
                style={[styles.addNewRow, { borderColor: colors.surfaceBorder }]}
                onPress={() => router.push("/cadastro-skill")}
              >
                <Feather name="plus-circle" size={14} color={colors.textMuted} />
                <Text style={[styles.addNewRowText, { color: colors.textSecondary }]}>Criar nova skill</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable style={[styles.skipBtn, { borderColor: colors.inputBorder }]} onPress={handleSkillsNext}>
              <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>pular</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={handleSkillsNext}>
              <Text style={styles.primaryBtnText}>Próximo</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* STEP 3 — TOOLS */}
      {draft.step === 3 && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.serviceNamePill, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.serviceNamePillText, { color: colors.text }]} numberOfLines={1}>{draft.serviceName}</Text>
              {draft.selectedSkillIds.map((sid) => {
                const sk = userSkills.find((s) => s.id === sid);
                return sk ? (
                  <View key={sid} style={[styles.pillBadge, { backgroundColor: "#e0603020", borderColor: "#e0603030" }]}>
                    <Feather name="star" size={9} color="#e06030" />
                    <Text style={styles.pillBadgeText}>{sk.name}</Text>
                  </View>
                ) : null;
              })}
            </View>

            <Text style={[styles.stepTitle, { color: colors.text }]}>Tools</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              {draft.mode === "predefined" && draft.requiredToolNames.length > 0
                ? `Este service costuma usar: ${draft.requiredToolNames.join(", ")}.`
                : "Selecione as tools que você usa neste service. Pode deixar em branco."}
            </Text>

            {/* Missing required tools warning */}
            {draft.mode === "predefined" && draft.requiredToolNames.length > 0 && (() => {
              const missingTools = draft.requiredToolNames.filter(
                (tn) => !userTools.some((t) => normalize(t.name).includes(normalize(tn)))
              );
              return missingTools.length > 0 ? (
                <View style={[styles.warningCard, { backgroundColor: "#e0603010", borderColor: "#e0603030" }]}>
                  <Feather name="alert-circle" size={16} color="#e06030" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningTitle, { color: "#e06030" }]}>Tools não encontradas</Text>
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                      Você não tem: {missingTools.join(", ")}. Cadastre-as para completar a composição ideal.
                    </Text>
                    <Pressable
                      style={styles.warningAction}
                      onPress={() => router.push("/cadastro-tool")}
                    >
                      <Text style={styles.warningActionText}>Criar tool</Text>
                      <Feather name="arrow-right" size={12} color="#e06030" />
                    </Pressable>
                  </View>
                </View>
              ) : null;
            })()}

            {/* Tool list */}
            <View style={styles.selectionList}>
              {userTools.map((tool) => {
                const isSelected = draft.selectedToolIds.includes(tool.id);
                const isRecommended = draft.requiredToolNames.some((tn) =>
                  normalize(tool.name).includes(normalize(tn))
                );
                return (
                  <SelectableToolCard
                    key={tool.id}
                    tool={tool}
                    selected={isSelected}
                    recommended={isRecommended}
                    colors={colors}
                    onPress={() => toggleTool(tool.id)}
                  />
                );
              })}

              <Pressable
                style={[styles.addNewRow, { borderColor: colors.surfaceBorder }]}
                onPress={() => router.push("/cadastro-tool")}
              >
                <Feather name="plus-circle" size={14} color={colors.textMuted} />
                <Text style={[styles.addNewRowText, { color: colors.textSecondary }]}>Criar nova tool</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable style={[styles.skipBtn, { borderColor: colors.inputBorder }]} onPress={handleToolsNext}>
              <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>pular</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={handleToolsNext}>
              <Text style={styles.primaryBtnText}>Próximo</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* STEP 4 — HOURLY RATE */}
      {draft.step === 4 && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.serviceNamePill, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.serviceNamePillText, { color: colors.text }]} numberOfLines={1}>{draft.serviceName}</Text>
              {draft.selectedSkillIds.map((sid) => {
                const sk = userSkills.find((s) => s.id === sid);
                return sk ? (
                  <View key={sid} style={[styles.pillBadge, { backgroundColor: "#e0603020", borderColor: "#e0603030" }]}>
                    <Feather name="star" size={9} color="#e06030" />
                    <Text style={styles.pillBadgeText}>{sk.name}</Text>
                  </View>
                ) : null;
              })}
              {draft.selectedToolIds.map((tid) => {
                const tl = userTools.find((t) => t.id === tid);
                return tl ? (
                  <View key={tid} style={[styles.pillBadge, { backgroundColor: "#e0603020", borderColor: "#e0603030" }]}>
                    <Feather name="tool" size={9} color="#e06030" />
                    <Text style={styles.pillBadgeText}>{tl.name}</Text>
                  </View>
                ) : null;
              })}
            </View>

            <Text style={[styles.stepTitle, { color: colors.text }]}>Valor por hora</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              Defina quanto você cobra por hora de trabalho neste service. Você pode alterar isso depois.
            </Text>

            {/* Big currency input */}
            <View style={[styles.rateInputWrap, { backgroundColor: colors.inputBg, borderColor: draft.hourlyRateInput ? "#e0603060" : colors.inputBorder }]}>
              <Text style={[styles.rateCurrency, { color: draft.hourlyRateInput ? "#e06030" : colors.textMuted }]}>R$</Text>
              <TextInput
                style={[styles.rateInput, { color: colors.text }]}
                value={draft.hourlyRateInput}
                onChangeText={handleHourlyRateInput}
                placeholder="0"
                placeholderTextColor={colors.textDim}
                keyboardType="numeric"
                autoFocus
                maxLength={6}
              />
              <Text style={[styles.rateDecimals, { color: draft.hourlyRateInput ? colors.textSecondary : colors.textDim }]}>,00</Text>
              <Text style={[styles.rateUnit, { color: colors.textMuted }]}>/h</Text>
            </View>

            {/* Quick pick presets */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>VALORES COMUNS</Text>
            <View style={styles.presetsRow}>
              {["30", "50", "80", "120", "200"].map((val) => {
                const isActive = draft.hourlyRateInput === val;
                return (
                  <Pressable
                    key={val}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isActive ? "#e06030" : colors.card,
                        borderColor: isActive ? "#e06030" : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setDraft({ hourlyRateInput: val })}
                  >
                    <Text style={[styles.presetChipText, { color: isActive ? "#fff" : colors.textSecondary }]}>
                      R$ {val}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Info card */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Feather name="info" size={13} color={colors.textMuted} style={{ flexShrink: 0, marginTop: 1 }} />
              <Text style={[styles.infoCardText, { color: colors.textMuted }]}>
                O valor é cobrado automaticamente a cada hora durante o contrato. O cliente vê o valor antes de contratar.
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable style={[styles.skipBtn, { borderColor: colors.inputBorder }]} onPress={handleHourlyRateNext}>
              <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>pular</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }, (!draft.hourlyRateInput || isSaving) && styles.primaryBtnDisabled]}
              onPress={handleHourlyRateNext}
              disabled={!draft.hourlyRateInput || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Concluir</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function TemplateCard({ template, colors, onPress }: {
  template: CatalogService;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.templateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={onPress}>
      <View style={styles.templateTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.templateName, { color: colors.text }]}>{template.nome}</Text>
          <Text style={[styles.templateDescription, { color: colors.textMuted }]} numberOfLines={2}>{template.description}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {template.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: "#e0603012", borderColor: "#e0603028" }]}>
              <Text style={[styles.categoryBadgeText, { color: "#e06030" }]}>{template.category}</Text>
            </View>
          ) : null}
          <Feather name="chevron-right" size={14} color={colors.chevron} />
        </View>
      </View>
    </Pressable>
  );
}

function SelectableSkillCard({ skill, selected, recommended, colors, onPress }: {
  skill: Skill;
  selected: boolean;
  recommended: boolean;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.selectableCard,
        {
          backgroundColor: colors.card,
          borderColor: selected ? "#e06030" : recommended ? "#e0603025" : colors.cardBorder,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.selectableIcon, { backgroundColor: colors.surface, borderColor: selected ? "#e0603060" : colors.surfaceBorder }]}>
        <Feather name="star" size={16} color={selected ? "#e06030" : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.selectableName, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>{skill.name}</Text>
          {skill.verified && <VerifiedBadge onPress={() => {}} />}
          {recommended && !selected && (
            <View style={[styles.recommendedBadge, { backgroundColor: "#e0603015", borderColor: "#e0603030" }]}>
              <Text style={styles.recommendedText}>recomendada</Text>
            </View>
          )}
        </View>
        {skill.description ? (
          <Text style={[styles.selectableSub, { color: colors.textMuted }]} numberOfLines={1}>{skill.description}</Text>
        ) : null}
      </View>
      <View style={[
        styles.checkbox,
        selected
          ? { backgroundColor: "#e06030", borderColor: "#e06030" }
          : { backgroundColor: "transparent", borderColor: colors.surfaceBorder },
      ]}>
        {selected && <Feather name="check" size={11} color="#fff" />}
      </View>
    </Pressable>
  );
}

function SelectableToolCard({ tool, selected, recommended, colors, onPress }: {
  tool: Tool;
  selected: boolean;
  recommended: boolean;
  colors: any;
  onPress: () => void;
}) {
  const iconColor = selected ? "#e06030" : tool.available ? colors.textMuted : colors.textDim;
  const borderColor = selected ? "#e06030" : recommended ? "#e0603020" : colors.cardBorder;

  return (
    <Pressable
      style={[styles.selectableCard, { backgroundColor: colors.card, borderColor, borderWidth: selected ? 1.5 : 1, opacity: tool.available ? 1 : 0.6 }]}
      onPress={onPress}
    >
      <View style={[styles.selectableIcon, { backgroundColor: colors.surface, borderColor: selected ? "#e0603060" : colors.surfaceBorder }]}>
        <Feather name={tool.icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.selectableName, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>{tool.name}</Text>
          {tool.verified && <VerifiedBadge onPress={() => {}} />}
          {recommended && !selected && (
            <View style={[styles.recommendedBadge, { backgroundColor: "#e0603010", borderColor: "#e0603025" }]}>
              <Text style={[styles.recommendedText, { color: "#e06030" }]}>sugerida</Text>
            </View>
          )}
        </View>
        <Text style={[styles.selectableSub, { color: colors.textMuted }]} numberOfLines={1}>{tool.type} · {tool.details}</Text>
        {!tool.available && (
          <Text style={[styles.selectableSub, { color: colors.textDim }]}>indisponível</Text>
        )}
      </View>
      <View style={[
        styles.checkbox,
        selected
          ? { backgroundColor: "#e06030", borderColor: "#e06030" }
          : { backgroundColor: "transparent", borderColor: colors.surfaceBorder },
      ]}>
        {selected && <Feather name="check" size={11} color="#fff" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, marginBottom: 24 },
  backBtn: { padding: 4, flexShrink: 0 },
  stepIndicator: { fontFamily: "DMSans_400Regular", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  progressBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#e06030", borderRadius: 2 },
  draftBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  draftBadgeText: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 0.5 },
  content: { paddingHorizontal: 20 },
  stepTitle: { fontFamily: "Sora_700Bold", fontSize: 22, marginBottom: 8 },
  stepSub: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 24 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 20 },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontFamily: "Sora_400Regular", fontSize: 14 },
  listLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  templateList: { gap: 10 },
  templateCard: { borderWidth: 1, borderRadius: 24, padding: 16 },
  templateTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  templateName: { fontFamily: "Sora_700Bold", fontSize: 15, marginBottom: 3 },
  templateDescription: { fontFamily: "Sora_400Regular", fontSize: 11, lineHeight: 16 },
  categoryBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  categoryBadgeText: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase" },
  compositionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  compositionChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  compositionChipText: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  createOptionCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 20 },
  createOptionIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  createOptionLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#e06030", marginBottom: 2 },
  createOptionName: { fontFamily: "Sora_700Bold", fontSize: 16 },
  createOptionCardSmall: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  createOptionSmallText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12 },
  nameCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 20 },
  nameCardLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  nameCardValue: { fontFamily: "Sora_700Bold", fontSize: 20 },
  fieldLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  textarea: { borderWidth: 1, borderRadius: 14, padding: 16, fontFamily: "Sora_400Regular", fontSize: 14, minHeight: 140, lineHeight: 22 },
  serviceNamePill: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 },
  serviceNamePillText: { fontFamily: "Sora_600SemiBold", fontSize: 13, flexShrink: 1 },
  pillBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  pillBadgeText: { fontFamily: "DMSans_400Regular", fontSize: 9, color: "#e06030" },
  warningCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20 },
  warningTitle: { fontFamily: "Sora_600SemiBold", fontSize: 13, marginBottom: 4 },
  warningText: { fontFamily: "Sora_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 8 },
  warningAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  warningActionText: { fontFamily: "Sora_600SemiBold", fontSize: 12, color: "#e06030" },
  selectionList: { gap: 10 },
  selectableCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 24, padding: 14 },
  selectableIcon: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  selectableName: { fontFamily: "Sora_600SemiBold", fontSize: 14, marginBottom: 2 },
  selectableSub: { fontFamily: "DMSans_400Regular", fontSize: 10, lineHeight: 15 },
  recommendedBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  recommendedText: { fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 0.3, color: "#e06030" },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addNewRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, padding: 14 },
  addNewRowText: { fontFamily: "DMSans_400Regular", fontSize: 12, flex: 1 },
  bottomBar: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  primaryBtn: { backgroundColor: "#e06030", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: "center", justifyContent: "center" },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontFamily: "Sora_700Bold", fontSize: 14, color: "#fff" },
  rateInputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18, gap: 8, marginBottom: 28 },
  rateCurrency: { fontFamily: "Sora_700Bold", fontSize: 28 },
  rateInput: { flex: 1, fontFamily: "Sora_700Bold", fontSize: 44, textAlign: "center" },
  rateDecimals: { fontFamily: "Sora_700Bold", fontSize: 28 },
  rateUnit: { fontFamily: "DMSans_400Regular", fontSize: 20 },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  presetChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  presetChipText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  infoCardText: { fontFamily: "Sora_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
});
