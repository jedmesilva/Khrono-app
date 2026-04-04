import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
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
import { MY_PROFILE, Skill, Tool } from "@/constants/profile-data";

const DRAFT_KEY = "@khrono/service_draft";

interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  skillName: string | null;
  toolNames: string[];
}

const SERVICE_TEMPLATES: ServiceTemplate[] = [
  { id: "t01", name: "Pintura Residencial", description: "Pintura de paredes internas e externas com acabamento de qualidade", category: "Construção", skillName: "Pintor", toolNames: ["Rolo", "Escada"] },
  { id: "t02", name: "Instalação Elétrica", description: "Instalação e manutenção de circuitos elétricos residenciais", category: "Construção", skillName: "Eletricista", toolNames: ["Kit Elétrico"] },
  { id: "t03", name: "Serviços de Encanamento", description: "Conserto e instalação de tubulações, torneiras e vasos sanitários", category: "Construção", skillName: "Encanador", toolNames: [] },
  { id: "t04", name: "Montagem de Móveis", description: "Montagem e desmontagem de móveis de todos os tipos e marcas", category: "Construção", skillName: "Montador de Móveis", toolNames: ["Furadeira", "Kit de Ferramentas"] },
  { id: "t05", name: "Marcenaria", description: "Fabricação e reparo de móveis e estruturas em madeira", category: "Construção", skillName: "Marceneiro", toolNames: ["Serra Circular"] },
  { id: "t06", name: "Gessaria e Drywall", description: "Instalação de gesso, drywall, texturas e acabamentos decorativos", category: "Construção", skillName: "Gesseiro", toolNames: [] },
  { id: "t07", name: "Mudança Residencial", description: "Transporte e mudança de móveis e pertences com cuidado", category: "Transporte", skillName: "Carregador / Mudanças", toolNames: ["Veículo", "Carrinho de Mudança"] },
  { id: "t08", name: "Personal Training", description: "Treinos personalizados para emagrecimento, hipertrofia e condicionamento", category: "Bem-estar", skillName: "Personal Trainer", toolNames: [] },
  { id: "t09", name: "Consultoria Nutricional", description: "Planos alimentares e orientação nutricional personalizada", category: "Bem-estar", skillName: "Nutricionista", toolNames: [] },
  { id: "t10", name: "Fisioterapia", description: "Atendimento fisioterapêutico residencial ou clínica", category: "Bem-estar", skillName: "Fisioterapeuta", toolNames: [] },
  { id: "t11", name: "Cuidados com Idosos", description: "Acompanhamento e cuidado com idosos ou pessoas com necessidades especiais", category: "Cuidados", skillName: "Cuidador", toolNames: [] },
  { id: "t12", name: "Babá / Cuidador Infantil", description: "Cuidados e supervisão de crianças em residência", category: "Cuidados", skillName: "Babá", toolNames: [] },
  { id: "t13", name: "Suporte em TI", description: "Suporte técnico, instalação de softwares e manutenção de computadores", category: "Tecnologia", skillName: "Técnico em TI", toolNames: [] },
  { id: "t14", name: "Desenvolvimento Web", description: "Criação e manutenção de sites e aplicações web", category: "Tecnologia", skillName: "Desenvolvedor Web", toolNames: [] },
  { id: "t15", name: "Limpeza Residencial", description: "Limpeza e organização de casas, apartamentos e espaços residenciais", category: "Limpeza", skillName: null, toolNames: [] },
  { id: "t16", name: "Limpeza Comercial", description: "Limpeza de escritórios, lojas e ambientes comerciais", category: "Limpeza", skillName: null, toolNames: [] },
  { id: "t17", name: "Jardinagem", description: "Manutenção de jardins, poda e paisagismo", category: "Jardinagem", skillName: "Jardineiro", toolNames: [] },
  { id: "t18", name: "Fotografia e Vídeo", description: "Cobertura fotográfica e audiovisual de eventos ou ensaios", category: "Arte", skillName: "Fotógrafo", toolNames: [] },
  { id: "t19", name: "Aulas Particulares", description: "Reforço escolar e aulas individuais em diversas disciplinas", category: "Educação", skillName: null, toolNames: [] },
  { id: "t20", name: "Motorista Particular", description: "Transporte particular com veículo próprio e seguro", category: "Transporte", skillName: "Motorista", toolNames: ["Carro"] },
];

type Step = 1 | 2 | 3 | "done";
type Step1Sub = "search" | "new_form";

interface Draft {
  step: Step;
  step1Sub: Step1Sub;
  mode: "predefined" | "custom" | null;
  serviceName: string;
  serviceDescription: string;
  templateId: string | null;
  requiredSkillName: string | null;
  requiredToolNames: string[];
  selectedSkillIds: string[];
  selectedToolIds: string[];
}

const EMPTY_DRAFT: Draft = {
  step: 1,
  step1Sub: "search",
  mode: null,
  serviceName: "",
  serviceDescription: "",
  templateId: null,
  requiredSkillName: null,
  requiredToolNames: [],
  selectedSkillIds: [],
  selectedToolIds: [],
};

const TOTAL_STEPS = 3;

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

  const userSkills = MY_PROFILE.skills;
  const userTools = MY_PROFILE.tools;

  const filteredTemplates = query.length > 0
    ? SERVICE_TEMPLATES.filter((t) => normalize(t.name).includes(normalize(query)) || normalize(t.category).includes(normalize(query)))
    : SERVICE_TEMPLATES;

  const hasExactMatch = query.length > 0 && SERVICE_TEMPLATES.some((t) => normalize(t.name) === normalize(query));
  const showCreateOption = query.length > 1 && filteredTemplates.length === 0;
  const showCreateOptionAtBottom = query.length > 1 && filteredTemplates.length > 0 && !hasExactMatch;

  function handleSelectTemplate(template: ServiceTemplate) {
    setDraft({
      step: 2,
      step1Sub: "search",
      mode: "predefined",
      serviceName: template.name,
      serviceDescription: template.description,
      templateId: template.id,
      requiredSkillName: template.skillName,
      requiredToolNames: template.toolNames,
      selectedSkillIds: template.skillName
        ? userSkills.filter((s) => normalize(s.name) === normalize(template.skillName!)).map((s) => s.id)
        : [],
      selectedToolIds: template.toolNames
        .map((tn) => userTools.find((t) => normalize(t.name).includes(normalize(tn)))?.id)
        .filter(Boolean) as string[],
    });
  }

  function handleCreateNew() {
    setDraft({
      step: 1,
      step1Sub: "new_form",
      mode: "custom",
      serviceName: query,
      serviceDescription: "",
      templateId: null,
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
    }
  }

  function handleSkillsNext() {
    setDraft({ step: 3 });
  }

  function handleToolsNext() {
    const finalName = draft.serviceName;
    setDraftState({ ...EMPTY_DRAFT, step: "done", serviceName: finalName });
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
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
            <Text style={{ color: "#ff6b35" }}>{draft.serviceName}</Text>
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
          <Feather name="arrow-left" size={18} color="#ff6b35" />
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

          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: query.length > 0 ? "#ff6b3550" : colors.inputBorder }]}>
            <Feather name="search" size={15} color={query.length > 0 ? "#ff6b35" : colors.textMuted} style={styles.inputIcon} />
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
              style={[styles.createOptionCard, { backgroundColor: colors.card, borderColor: "#ff6b35" }]}
              onPress={handleCreateNew}
            >
              <View style={[styles.createOptionIcon, { backgroundColor: "#ff6b3520", borderColor: "#ff6b3540" }]}>
                <Feather name="plus" size={18} color="#ff6b35" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createOptionLabel}>Criar serviço</Text>
                <Text style={[styles.createOptionName, { color: colors.text }]} numberOfLines={1}>"{query}"</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#ff6b35" />
            </Pressable>
          )}

          {query.length === 0 && (
            <Text style={[styles.listLabel, { color: colors.textMuted }]}>SUGESTÕES POPULARES</Text>
          )}
          {query.length > 0 && filteredTemplates.length > 0 && (
            <Text style={[styles.listLabel, { color: colors.textMuted }]}>{filteredTemplates.length} RESULTADO{filteredTemplates.length !== 1 ? "S" : ""}</Text>
          )}

          <View style={styles.templateList}>
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                colors={colors}
                userSkills={userSkills}
                userTools={userTools}
                onPress={() => handleSelectTemplate(template)}
              />
            ))}

            {showCreateOptionAtBottom && (
              <Pressable
                style={[styles.createOptionCardSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={handleCreateNew}
              >
                <Feather name="plus-circle" size={14} color="#ff6b35" />
                <Text style={[styles.createOptionSmallText, { color: colors.textSecondary }]}>
                  Criar "<Text style={{ color: "#ff6b35" }}>{query}</Text>" como novo service
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

            <View style={[styles.nameCard, { backgroundColor: colors.card, borderColor: "#ff6b3530" }]}>
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
              <View style={[styles.warningCard, { backgroundColor: "#ff6b3510", borderColor: "#ff6b3530" }]}>
                <Feather name="alert-circle" size={16} color="#ff6b35" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.warningTitle, { color: "#ff6b35" }]}>Skill não encontrada</Text>
                  <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                    Você não tem a skill "{draft.requiredSkillName}" cadastrada. Cadastre-a para completar a composição ideal.
                  </Text>
                  <Pressable
                    style={styles.warningAction}
                    onPress={() => router.push("/cadastro-skill")}
                  >
                    <Text style={styles.warningActionText}>Criar skill</Text>
                    <Feather name="arrow-right" size={12} color="#ff6b35" />
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
                  <View key={sid} style={[styles.pillBadge, { backgroundColor: "#ff6b3520", borderColor: "#ff6b3530" }]}>
                    <Feather name="star" size={9} color="#ff6b35" />
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
                <View style={[styles.warningCard, { backgroundColor: "#ff6b3510", borderColor: "#ff6b3530" }]}>
                  <Feather name="alert-circle" size={16} color="#ff6b35" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningTitle, { color: "#ff6b35" }]}>Tools não encontradas</Text>
                    <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                      Você não tem: {missingTools.join(", ")}. Cadastre-as para completar a composição ideal.
                    </Text>
                    <Pressable
                      style={styles.warningAction}
                      onPress={() => router.push("/cadastro-tool")}
                    >
                      <Text style={styles.warningActionText}>Criar tool</Text>
                      <Feather name="arrow-right" size={12} color="#ff6b35" />
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
              <Text style={styles.primaryBtnText}>Concluir</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function TemplateCard({ template, colors, userSkills, userTools, onPress }: {
  template: ServiceTemplate;
  colors: any;
  userSkills: Skill[];
  userTools: Tool[];
  onPress: () => void;
}) {
  const hasSkill = template.skillName
    ? userSkills.some((s) => normalize(s.name) === normalize(template.skillName!))
    : true;
  const matchedTools = template.toolNames.filter((tn) =>
    userTools.some((t) => normalize(t.name).includes(normalize(tn)))
  );
  const compatScore = (hasSkill ? 1 : 0) + (template.toolNames.length === 0 ? 0 : matchedTools.length / template.toolNames.length);
  const isFullMatch = hasSkill && (template.toolNames.length === 0 || matchedTools.length === template.toolNames.length);

  return (
    <Pressable style={[styles.templateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={onPress}>
      <View style={styles.templateTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
          <Text style={[styles.templateDescription, { color: colors.textMuted }]} numberOfLines={2}>{template.description}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <View style={[styles.categoryBadge, { backgroundColor: "#ff6b3512", borderColor: "#ff6b3528" }]}>
            <Text style={[styles.categoryBadgeText, { color: "#ff6b35" }]}>{template.category}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={colors.chevron} />
        </View>
      </View>

      {(template.skillName || template.toolNames.length > 0) && (
        <View style={[styles.compositionRow, { marginBottom: 0 }]}>
          {template.skillName && (
            <View style={[styles.compositionChip, { backgroundColor: "#ff6b3512", borderColor: "#ff6b3528", opacity: hasSkill ? 1 : 0.45 }]}>
              <Feather name="star" size={9} color="#ff6b35" />
              <Text style={[styles.compositionChipText, { color: "#ff6b35" }]} numberOfLines={1}>{template.skillName}</Text>
            </View>
          )}
          {template.toolNames.map((tn) => {
            const has = userTools.some((t) => normalize(t.name).includes(normalize(tn)));
            return (
              <View key={tn} style={[styles.compositionChip, { backgroundColor: "#ff6b3512", borderColor: "#ff6b3528", opacity: has ? 1 : 0.45 }]}>
                <Feather name="tool" size={9} color="#ff6b35" />
                <Text style={[styles.compositionChipText, { color: "#ff6b35" }]} numberOfLines={1}>{tn}</Text>
              </View>
            );
          })}
        </View>
      )}
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
          borderColor: selected ? "#ff6b35" : recommended ? "#ff6b3525" : colors.cardBorder,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.selectableIcon, { backgroundColor: colors.surface, borderColor: selected ? "#ff6b3560" : colors.surfaceBorder }]}>
        <Feather name="star" size={16} color={selected ? "#ff6b35" : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.selectableName, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>{skill.name}</Text>
          {skill.verified && <VerifiedBadge onPress={() => {}} />}
          {recommended && !selected && (
            <View style={[styles.recommendedBadge, { backgroundColor: "#ff6b3515", borderColor: "#ff6b3530" }]}>
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
          ? { backgroundColor: "#ff6b35", borderColor: "#ff6b35" }
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
  const iconColor = selected ? "#ff6b35" : tool.available ? colors.textMuted : colors.textDim;
  const borderColor = selected ? "#ff6b35" : recommended ? "#ff6b3520" : colors.cardBorder;

  return (
    <Pressable
      style={[styles.selectableCard, { backgroundColor: colors.card, borderColor, borderWidth: selected ? 1.5 : 1, opacity: tool.available ? 1 : 0.6 }]}
      onPress={onPress}
    >
      <View style={[styles.selectableIcon, { backgroundColor: colors.surface, borderColor: selected ? "#ff6b3560" : colors.surfaceBorder }]}>
        <Feather name={tool.icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.selectableName, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>{tool.name}</Text>
          {tool.verified && <VerifiedBadge onPress={() => {}} />}
          {recommended && !selected && (
            <View style={[styles.recommendedBadge, { backgroundColor: "#ff6b3510", borderColor: "#ff6b3525" }]}>
              <Text style={[styles.recommendedText, { color: "#ff6b35" }]}>sugerida</Text>
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
          ? { backgroundColor: "#ff6b35", borderColor: "#ff6b35" }
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
  stepIndicator: { fontFamily: "DMMono_400Regular", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  progressBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#ff6b35", borderRadius: 2 },
  draftBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  draftBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 0.5 },
  content: { paddingHorizontal: 20 },
  stepTitle: { fontFamily: "Sora_700Bold", fontSize: 22, marginBottom: 8 },
  stepSub: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 24 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 20 },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontFamily: "Sora_400Regular", fontSize: 14 },
  listLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  templateList: { gap: 10 },
  templateCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  templateTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  templateName: { fontFamily: "Sora_700Bold", fontSize: 15, marginBottom: 3 },
  templateDescription: { fontFamily: "Sora_400Regular", fontSize: 11, lineHeight: 16 },
  categoryBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  categoryBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase" },
  compositionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  compositionChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  compositionChipText: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  createOptionCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  createOptionIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  createOptionLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#ff6b35", marginBottom: 2 },
  createOptionName: { fontFamily: "Sora_700Bold", fontSize: 16 },
  createOptionCardSmall: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  createOptionSmallText: { flex: 1, fontFamily: "DMMono_400Regular", fontSize: 12 },
  nameCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 20 },
  nameCardLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  nameCardValue: { fontFamily: "Sora_700Bold", fontSize: 20 },
  fieldLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  textarea: { borderWidth: 1, borderRadius: 14, padding: 16, fontFamily: "Sora_400Regular", fontSize: 14, minHeight: 140, lineHeight: 22 },
  serviceNamePill: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 },
  serviceNamePillText: { fontFamily: "Sora_600SemiBold", fontSize: 13, flexShrink: 1 },
  pillBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  pillBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 9, color: "#ff6b35" },
  warningCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20 },
  warningTitle: { fontFamily: "Sora_600SemiBold", fontSize: 13, marginBottom: 4 },
  warningText: { fontFamily: "Sora_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 8 },
  warningAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  warningActionText: { fontFamily: "Sora_600SemiBold", fontSize: 12, color: "#ff6b35" },
  selectionList: { gap: 10 },
  selectableCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 16, padding: 14 },
  selectableIcon: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  selectableName: { fontFamily: "Sora_600SemiBold", fontSize: 14, marginBottom: 2 },
  selectableSub: { fontFamily: "DMMono_400Regular", fontSize: 10, lineHeight: 15 },
  recommendedBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  recommendedText: { fontFamily: "DMMono_400Regular", fontSize: 8, letterSpacing: 0.3, color: "#ff6b35" },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addNewRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, padding: 14 },
  addNewRowText: { fontFamily: "DMMono_400Regular", fontSize: 12, flex: 1 },
  bottomBar: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontFamily: "DMMono_400Regular", fontSize: 13 },
  primaryBtn: { backgroundColor: "#ff6b35", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: "center", justifyContent: "center" },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontFamily: "Sora_700Bold", fontSize: 14, color: "#fff" },
});
