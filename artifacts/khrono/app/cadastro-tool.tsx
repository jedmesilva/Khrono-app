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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

interface ToolTemplate {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  icon: "truck" | "tool" | "box";
  description: string;
}

const TOOL_TYPES = [
  { id: "veiculo", label: "Veículo", icon: "truck" as const },
  { id: "ferramenta", label: "Ferramenta", icon: "tool" as const },
  { id: "equipamento", label: "Equipamento", icon: "box" as const },
];

const TOOL_TEMPLATES: ToolTemplate[] = [
  { id: "tv01", name: "Carro", type: "veiculo", typeLabel: "Veículo", icon: "truck", description: "Veículo de passeio para transporte de pessoas ou pequenas cargas." },
  { id: "tv02", name: "Moto", type: "veiculo", typeLabel: "Veículo", icon: "truck", description: "Motocicleta para deslocamentos rápidos e entregas ágeis." },
  { id: "tv03", name: "Van", type: "veiculo", typeLabel: "Veículo", icon: "truck", description: "Van para transporte de cargas médias, mudanças e grupos." },
  { id: "tv04", name: "Caminhão", type: "veiculo", typeLabel: "Veículo", icon: "truck", description: "Caminhão para transporte de cargas pesadas e mudanças de grande porte." },
  { id: "tv05", name: "Pickup", type: "veiculo", typeLabel: "Veículo", icon: "truck", description: "Caminhonete para transporte de cargas leves e materiais de construção." },
  { id: "tv06", name: "Bicicleta", type: "veiculo", typeLabel: "Veículo", icon: "truck", description: "Bicicleta para entregas locais e deslocamentos de curta distância." },
  { id: "tv07", name: "Scooter", type: "veiculo", typeLabel: "Veículo", icon: "truck", description: "Scooter elétrica ou a gasolina para entregas rápidas e mobilidade urbana." },
  { id: "tf01", name: "Furadeira", type: "ferramenta", typeLabel: "Ferramenta", icon: "tool", description: "Furadeira elétrica para perfuração em paredes, madeira e metal." },
  { id: "tf02", name: "Serra Circular", type: "ferramenta", typeLabel: "Ferramenta", icon: "tool", description: "Serra circular para cortes precisos em madeira e outros materiais." },
  { id: "tf03", name: "Parafusadeira", type: "ferramenta", typeLabel: "Ferramenta", icon: "tool", description: "Parafusadeira elétrica para montagem e fixação rápida de peças." },
  { id: "tf04", name: "Esmerilhadeira", type: "ferramenta", typeLabel: "Ferramenta", icon: "tool", description: "Esmerilhadeira angular para corte, desbaste e polimento de metais." },
  { id: "tf05", name: "Martelo", type: "ferramenta", typeLabel: "Ferramenta", icon: "tool", description: "Martelo para fixação, demolição leve e trabalhos manuais em geral." },
  { id: "tf06", name: "Chave de Fenda", type: "ferramenta", typeLabel: "Ferramenta", icon: "tool", description: "Jogo de chaves de fenda para aperto e soltura de parafusos de diferentes tipos." },
  { id: "tf07", name: "Nível a Laser", type: "ferramenta", typeLabel: "Ferramenta", icon: "tool", description: "Nível a laser para nivelamento e alinhamento preciso em instalações." },
  { id: "te01", name: "Escada", type: "equipamento", typeLabel: "Equipamento", icon: "box", description: "Escada extensível ou de degraus para trabalhos em altura." },
  { id: "te02", name: "Carrinho de Mudança", type: "equipamento", typeLabel: "Equipamento", icon: "box", description: "Carrinho plataforma para movimentação de móveis e caixas pesadas." },
  { id: "te03", name: "Betoneira", type: "equipamento", typeLabel: "Equipamento", icon: "box", description: "Betoneira elétrica para mistura de concreto e argamassa em obras." },
  { id: "te04", name: "Compressor de Ar", type: "equipamento", typeLabel: "Equipamento", icon: "box", description: "Compressor de ar para pintura a pistola, limpeza e ferramentas pneumáticas." },
  { id: "te05", name: "Gerador", type: "equipamento", typeLabel: "Equipamento", icon: "box", description: "Gerador de energia para uso em locais sem tomada ou em quedas de energia." },
  { id: "te06", name: "Andaime", type: "equipamento", typeLabel: "Equipamento", icon: "box", description: "Andaime tubular para trabalhos em fachadas, tetos e ambientes elevados." },
  { id: "te07", name: "Aspirador Industrial", type: "equipamento", typeLabel: "Equipamento", icon: "box", description: "Aspirador de alta potência para limpeza de obras, pós e resíduos pesados." },
];

const TOTAL_STEPS = 2;
type Step = 1 | 2 | "done";
type Step1Sub = "search" | "new_form";

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function CadastroToolScreen() {
  const { colors } = useTheme();
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

  const currentStep = step === "done" ? TOTAL_STEPS : (step as number);
  const progress = currentStep / TOTAL_STEPS;

  const filteredTemplates = query.length > 0
    ? TOOL_TEMPLATES.filter((t) =>
        normalize(t.name).includes(normalize(query)) ||
        normalize(t.typeLabel).includes(normalize(query))
      )
    : TOOL_TEMPLATES;

  const hasExactMatch = query.length > 0 && TOOL_TEMPLATES.some((t) => normalize(t.name) === normalize(query));
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

  function handleDetailsNext() {
    setStep("done");
  }

  function handleReset() {
    setStep(1);
    setStep1Sub("search");
    setToolType("");
    setToolName("");
    setQuery("");
    setDetails("");
    setAvailable(true);
  }

  if (step === "done") {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Feather name="check" size={32} color="#ff6b35" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.text }]}>Tool adicionada!</Text>
          <Text style={[styles.doneSub, { color: colors.textSecondary }]}>
            <Text style={{ color: "#ff6b35" }}>{toolName}</Text> foi cadastrada no seu perfil como{" "}
            {available ? "disponível" : "indisponível"}.
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={handleReset}>
            <Feather name="plus" size={14} color="#ff6b35" />
            <Text style={styles.secondaryBtnText}>Adicionar outra tool</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Ver perfil</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
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
            <Text style={[styles.stepIndicator, { color: colors.textMuted }]}>NOVA TOOL</Text>
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
          <Text style={[styles.stepTitle, { color: colors.text }]}>Qual é a sua tool?</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            Escolha uma da lista ou escreva o nome do equipamento, ferramenta ou veículo que você usa.
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: query.length > 0 ? "#ff6b3550" : colors.inputBorder }]}>
            <Feather name="search" size={15} color={query.length > 0 ? "#ff6b35" : colors.textMuted} style={styles.inputIcon} />
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

          {showCreateOnly && (
            <Pressable
              style={[styles.createOptionCard, { backgroundColor: colors.card, borderColor: "#ff6b35" }]}
              onPress={handleCreateNew}
            >
              <View style={[styles.createOptionIcon, { backgroundColor: "#ff6b3520", borderColor: "#ff6b3540" }]}>
                <Feather name="plus" size={18} color="#ff6b35" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createOptionLabel}>Criar tool</Text>
                <Text style={[styles.createOptionName, { color: colors.text }]} numberOfLines={1}>"{query}"</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#ff6b35" />
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
              <ToolCard key={t.id} template={t} colors={colors} onPress={() => handleSelectTemplate(t)} />
            ))}

            {showCreateAtBottom && (
              <Pressable
                style={[styles.createOptionCardSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={handleCreateNew}
              >
                <Feather name="plus-circle" size={14} color="#ff6b35" />
                <Text style={[styles.createOptionSmallText, { color: colors.textSecondary }]}>
                  Criar "<Text style={{ color: "#ff6b35" }}>{query}</Text>" como nova tool
                </Text>
                <Feather name="chevron-right" size={14} color={colors.chevron} />
              </Pressable>
            )}
          </View>
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

            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
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
            <View style={styles.typeRow}>
              {TOOL_TYPES.map((t) => (
                <Pressable
                  key={t.id}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: colors.card,
                      borderColor: toolType === t.id ? "#ff6b35" : colors.cardBorder,
                      borderWidth: toolType === t.id ? 1.5 : 1,
                    },
                  ]}
                  onPress={() => setToolType(t.id)}
                >
                  <Feather name={t.icon} size={14} color={toolType === t.id ? "#ff6b35" : colors.textMuted} />
                  <Text style={[styles.typeChipText, { color: toolType === t.id ? colors.text : colors.textSecondary }]}>
                    {t.label}
                  </Text>
                  {toolType === t.id && <Feather name="check" size={12} color="#ff6b35" />}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable
              style={[styles.primaryBtn, { flex: 1 }, (!toolName.trim() || !toolType) && styles.primaryBtnDisabled]}
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
            <View style={[styles.nameCard, { backgroundColor: colors.card, borderColor: "#ff6b3530" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={[styles.nameCardValue, { color: colors.text, flex: 1 }]}>{toolName}</Text>
                <View style={[styles.typeBadge, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <Feather
                    name={TOOL_TYPES.find((t) => t.id === toolType)?.icon ?? "box"}
                    size={10}
                    color={colors.textMuted}
                  />
                  <Text style={[styles.typeBadgeText, { color: colors.textMuted }]}>
                    {TOOL_TYPES.find((t) => t.id === toolType)?.label ?? toolType}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.stepTitle, { color: colors.text }]}>Detalhes</Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              Adicione informações extras sobre{" "}
              <Text style={{ color: "#ff6b35" }}>{toolName}</Text> e defina a disponibilidade.
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

            <View style={[styles.availCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.availTitle, { color: colors.text }]}>Disponível agora</Text>
                <Text style={[styles.availSub, { color: colors.textMuted }]}>
                  {available ? "Esta tool aparecerá como disponível no perfil." : "Esta tool aparecerá como indisponível."}
                </Text>
              </View>
              <Switch
                value={available}
                onValueChange={setAvailable}
                trackColor={{ false: colors.surfaceBorder, true: "#00e5a060" }}
                thumbColor={available ? "#00e5a0" : colors.textMuted}
              />
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, borderTopColor: colors.surface }]}>
            <Pressable style={[styles.skipBtn, { borderColor: colors.inputBorder }]} onPress={handleDetailsNext}>
              <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>pular</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={handleDetailsNext}>
              <Text style={styles.primaryBtnText}>Concluir</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function ToolCard({ template, colors, onPress }: {
  template: ToolTemplate;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.templateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={onPress}
    >
      <View style={styles.templateTopRow}>
        <View style={[styles.templateIconWrap, { backgroundColor: "#ff6b3312", borderColor: "#ff6b3328" }]}>
          <Feather name={template.icon} size={16} color="#ff6b35" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
          <Text style={[styles.templateDescription, { color: colors.textMuted }]} numberOfLines={1}>
            {template.description}
          </Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.categoryBadgeText, { color: colors.textMuted }]}>{template.typeLabel}</Text>
        </View>
      </View>
      <View style={styles.templateFooter}>
        <Feather name="chevron-right" size={14} color={colors.chevron} />
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
  content: { paddingHorizontal: 20 },
  stepTitle: { fontFamily: "Sora_700Bold", fontSize: 22, marginBottom: 8 },
  stepSub: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 24 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 20 },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontFamily: "Sora_400Regular", fontSize: 14 },
  listLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  templateList: { gap: 10 },
  templateCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  templateTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  templateIconWrap: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  templateName: { fontFamily: "Sora_700Bold", fontSize: 15, marginBottom: 2 },
  templateDescription: { fontFamily: "Sora_400Regular", fontSize: 11, lineHeight: 16 },
  categoryBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  categoryBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase" },
  templateFooter: { alignItems: "flex-end" },
  createOptionCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  createOptionIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  createOptionLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#ff6b35", marginBottom: 2 },
  createOptionName: { fontFamily: "Sora_700Bold", fontSize: 16 },
  createOptionCardSmall: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  createOptionSmallText: { flex: 1, fontFamily: "DMMono_400Regular", fontSize: 12 },
  fieldLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  typeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 },
  typeChipText: { fontFamily: "DMMono_400Regular", fontSize: 11 },
  nameCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 20 },
  nameCardValue: { fontFamily: "Sora_700Bold", fontSize: 20 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 0.5 },
  textarea: { borderWidth: 1, borderRadius: 14, padding: 16, fontFamily: "Sora_400Regular", fontSize: 14, minHeight: 120, lineHeight: 22, marginBottom: 16 },
  availCard: { borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 16 },
  availTitle: { fontFamily: "Sora_600SemiBold", fontSize: 14, marginBottom: 3 },
  availSub: { fontFamily: "DMMono_400Regular", fontSize: 10, lineHeight: 15 },
  bottomBar: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontFamily: "DMMono_400Regular", fontSize: 13 },
  primaryBtn: { backgroundColor: "#ff6b35", borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontFamily: "Sora_700Bold", fontSize: 14, color: "#fff" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ff6b3512", borderWidth: 1, borderColor: "#ff6b3530", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: "100%", justifyContent: "center" },
  secondaryBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 14, color: "#ff6b35" },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#ff6b3515", borderWidth: 1, borderColor: "#ff6b3530", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  doneTitle: { fontFamily: "Sora_700Bold", fontSize: 22, textAlign: "center" },
  doneSub: { fontFamily: "Sora_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 12 },
});
