import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { SkillListCard } from "@/components/SkillListCard";
import { useTheme } from "@/context/ThemeContext";

interface SkillTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
}

const SKILL_TEMPLATES: SkillTemplate[] = [
  { id: "s01", name: "Eletricista", category: "Construção", description: "Instalação e manutenção de circuitos elétricos residenciais e comerciais." },
  { id: "s02", name: "Encanador", category: "Construção", description: "Conserto e instalação de tubulações, torneiras e sistemas hidráulicos." },
  { id: "s03", name: "Pintor", category: "Construção", description: "Pintura de paredes internas e externas com acabamento profissional." },
  { id: "s04", name: "Montador de Móveis", category: "Construção", description: "Montagem e desmontagem de móveis de todos os tipos e marcas." },
  { id: "s05", name: "Marceneiro", category: "Construção", description: "Fabricação e reparo de móveis e estruturas em madeira." },
  { id: "s06", name: "Pedreiro", category: "Construção", description: "Construção, reforma e acabamento de alvenaria e estruturas." },
  { id: "s07", name: "Gesseiro", category: "Construção", description: "Instalação de gesso, drywall, texturas e acabamentos decorativos." },
  { id: "s08", name: "Personal Trainer", category: "Bem-estar", description: "Treinos personalizados para emagrecimento, hipertrofia e condicionamento." },
  { id: "s09", name: "Nutricionista", category: "Bem-estar", description: "Planos alimentares e orientação nutricional personalizada." },
  { id: "s10", name: "Fisioterapeuta", category: "Bem-estar", description: "Atendimento fisioterapêutico residencial ou em clínica." },
  { id: "s11", name: "Cuidador", category: "Cuidados", description: "Acompanhamento e cuidado com idosos ou pessoas com necessidades especiais." },
  { id: "s12", name: "Babá", category: "Cuidados", description: "Cuidados e supervisão de crianças em residência." },
  { id: "s13", name: "Técnico em TI", category: "Tecnologia", description: "Suporte técnico, instalação de softwares e manutenção de computadores." },
  { id: "s14", name: "Desenvolvedor Web", category: "Tecnologia", description: "Criação e manutenção de sites e aplicações web." },
  { id: "s15", name: "Designer de Interiores", category: "Arte", description: "Projetos de decoração e planejamento de ambientes residenciais e comerciais." },
  { id: "s16", name: "Motorista", category: "Transporte", description: "Transporte particular com veículo próprio e condução segura." },
  { id: "s17", name: "Fotógrafo", category: "Arte", description: "Cobertura fotográfica de eventos, ensaios e produções." },
  { id: "s18", name: "Cozinheiro", category: "Culinária", description: "Preparo de refeições para eventos, residências ou empresas." },
  { id: "s19", name: "Jardineiro", category: "Jardinagem", description: "Manutenção de jardins, poda de árvores e paisagismo." },
  { id: "s20", name: "Carregador / Mudanças", category: "Transporte", description: "Transporte e mudança de móveis e pertences com cuidado." },
];

const TOTAL_STEPS = 2;
type Step = 1 | 2 | "done";
type Step1Sub = "search" | "new_form";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function CadastroSkillScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [step, setStep] = useState<Step>(1);
  const [step1Sub, setStep1Sub] = useState<Step1Sub>("search");
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");

  const currentStep = step === "done" ? TOTAL_STEPS : (step as number);
  const progress = currentStep / TOTAL_STEPS;

  const filteredTemplates = query.length > 0
    ? SKILL_TEMPLATES.filter((t) =>
        normalize(t.name).includes(normalize(query)) ||
        normalize(t.category).includes(normalize(query))
      )
    : SKILL_TEMPLATES;

  const hasExactMatch = query.length > 0 && SKILL_TEMPLATES.some((t) => normalize(t.name) === normalize(query));
  const showCreateOnly = query.length > 1 && filteredTemplates.length === 0;
  const showCreateAtBottom = query.length > 1 && filteredTemplates.length > 0 && !hasExactMatch;

  function handleSelectTemplate(t: SkillTemplate) {
    setSkillName(t.name);
    setDescription(t.description);
    setStep(2);
  }

  function handleCreateNew() {
    setSkillName(query);
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
    if (!skillName.trim()) return;
    setStep(2);
  }

  function handleReset() {
    setStep(1);
    setStep1Sub("search");
    setSkillName("");
    setDescription("");
    setQuery("");
  }

  if (step === "done") {
    return (
      <CadastroDone
        topPadding={topPadding}
        title="Skill adicionada!"
        secondaryAction={{ label: "Adicionar outra skill", icon: "plus", onPress: handleReset }}
        subtitle={
          <>
            <Text style={{ color: "#e06030" }}>{skillName}</Text>
            {" foi cadastrada no seu perfil."}
          </>
        }
        onVerPerfil={() => router.back()}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Feather name="arrow-left" size={18} color="#e06030" />
        </Pressable>
        <View style={{ flex: 1 }}>
          {step !== 1 || step1Sub === "new_form" ? (
            <>
              <Text style={[styles.stepIndicator, { color: colors.textMuted }]}>
                Passo {currentStep} de {TOTAL_STEPS}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
            </>
          ) : (
            <Text style={[styles.stepIndicator, { color: colors.textMuted }]}>NOVA SKILL</Text>
          )}
        </View>
      </View>

      {/* STEP 1 — SEARCH */}
      {step === 1 && step1Sub === "search" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.stepTitle, { color: colors.text }]}>Qual é a sua skill?</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            Escolha uma da lista ou escreva o nome da skill que você oferece.
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: query.length > 0 ? "#e0603050" : colors.inputBorder }]}>
            <Feather name="search" size={15} color={query.length > 0 ? "#e06030" : colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar skill..."
              placeholderTextColor={colors.textDim}
              autoCapitalize="words"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Feather name="x" size={15} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {showCreateOnly && (
            <Pressable
              style={[styles.createOptionCard, { backgroundColor: colors.card, borderColor: "#e06030" }]}
              onPress={handleCreateNew}
            >
              <View style={[styles.createOptionIcon, { backgroundColor: "#e0603020", borderColor: "#e0603040" }]}>
                <Feather name="plus" size={18} color="#e06030" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createOptionLabel}>Criar skill</Text>
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
              <SkillListCard
                key={t.id}
                name={t.name}
                description={t.description}
                badge={t.category}
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
                  Criar "<Text style={{ color: "#e06030" }}>{query}</Text>" como nova skill
                </Text>
                <Feather name="chevron-right" size={14} color={colors.chevron} />
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}

      {/* STEP 1 — NEW SKILL FORM */}
      {step === 1 && step1Sub === "new_form" && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.stepTitle, { color: colors.text }]}>Nova skill</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              Confirme o nome da skill que você quer adicionar.
            </Text>

            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={skillName}
                onChangeText={setSkillName}
                placeholder="Nome da skill..."
                placeholderTextColor={colors.textDim}
                autoCapitalize="words"
                autoFocus
              />
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }, !skillName.trim() && styles.primaryBtnDisabled]}
              onPress={handleNewFormNext}
              disabled={!skillName.trim()}
            >
              <Text style={styles.primaryBtnText}>Próximo</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* STEP 2 — DESCRIPTION */}
      {step === 2 && (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.nameCard, { backgroundColor: colors.card, borderColor: "#e0603030" }]}>
              <Text style={[styles.nameCardLabel, { color: colors.textMuted }]}>SKILL</Text>
              <Text style={[styles.nameCardValue, { color: colors.text }]}>{skillName}</Text>
            </View>

            <Text style={[styles.stepTitle, { color: colors.text }]}>Descreva sua skill</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              Conte brevemente o que você faz com{" "}
              <Text style={{ color: "#e06030" }}>{skillName}</Text>. Isso é opcional.
            </Text>

            <TextInput
              style={[styles.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: realizo montagem de móveis de todos os tipos, com ferramentas próprias..."
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable style={[styles.skipBtn, { borderColor: colors.inputBorder }]} onPress={() => setStep("done")}>
              <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>pular</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={() => setStep("done")}>
              <Text style={styles.primaryBtnText}>Concluir</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, marginBottom: 24 },
  backBtn: { padding: 4, flexShrink: 0 },
  stepIndicator: { fontFamily: "DMSans_400Regular", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  progressBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#e06030", borderRadius: 2 },
  content: { paddingHorizontal: 20 },
  stepTitle: { fontFamily: "Sora_700Bold", fontSize: 22, marginBottom: 8 },
  stepSub: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 24 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 20 },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontFamily: "Sora_400Regular", fontSize: 14 },
  listLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  templateList: { gap: 10 },
  createOptionCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 20 },
  createOptionIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  createOptionLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#e06030", marginBottom: 2 },
  createOptionName: { fontFamily: "Sora_700Bold", fontSize: 16 },
  createOptionCardSmall: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  createOptionSmallText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12 },
  nameCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 20 },
  nameCardLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  nameCardValue: { fontFamily: "Sora_700Bold", fontSize: 20 },
  textarea: { borderWidth: 1, borderRadius: 14, padding: 16, fontFamily: "Sora_400Regular", fontSize: 14, minHeight: 140, lineHeight: 22 },
  bottomBar: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  primaryBtn: { backgroundColor: "#e06030", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: "center", justifyContent: "center" },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontFamily: "Sora_700Bold", fontSize: 14, color: "#fff" },
});
