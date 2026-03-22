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

import Colors from "@/constants/colors";

const TOOL_TYPES = [
  {
    id: "veiculo",
    label: "Veículo",
    icon: "truck" as const,
    description: "Carro, moto, van ou qualquer veículo usado no trabalho",
  },
  {
    id: "ferramenta",
    label: "Ferramenta",
    icon: "tool" as const,
    description: "Ferramentas manuais ou elétricas que você utiliza",
  },
  {
    id: "equipamento",
    label: "Equipamento",
    icon: "box" as const,
    description: "Equipamentos, máquinas ou acessórios especializados",
  },
];

const SUGGESTIONS_BY_TYPE: Record<string, string[]> = {
  veiculo: ["Carro", "Moto", "Van", "Caminhão", "Pickup", "Bicicleta", "Scooter"],
  ferramenta: [
    "Furadeira",
    "Serra Circular",
    "Parafusadeira",
    "Esmerilhadeira",
    "Martelo",
    "Chave de Fenda",
    "Nível a Laser",
  ],
  equipamento: [
    "Escada",
    "Carrinho de Mudança",
    "Betoneira",
    "Compressor de Ar",
    "Gerador",
    "Andaime",
    "Aspirador Industrial",
  ],
};

const TOTAL_STEPS = 3;
type Step = 1 | 2 | 3 | "done";

export default function CadastroToolScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [step, setStep] = useState<Step>(1);
  const [toolType, setToolType] = useState<string>("");
  const [toolName, setToolName] = useState("");
  const [query, setQuery] = useState("");
  const [details, setDetails] = useState("");
  const [available, setAvailable] = useState(true);

  const suggestions = toolType ? SUGGESTIONS_BY_TYPE[toolType] ?? [] : [];
  const filtered =
    query.length > 0
      ? suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
      : [];

  const currentStep = step === "done" ? TOTAL_STEPS : (step as number);
  const progress = currentStep / TOTAL_STEPS;

  function handleSelectSuggestion(name: string) {
    setToolName(name);
    setQuery(name);
  }

  function handleBack() {
    if (step === 1) router.back();
    else if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  function handleNext() {
    if (step === 1 && toolType) {
      setStep(2);
    } else if (step === 2) {
      const name = toolName || query;
      if (!name.trim()) return;
      setToolName(name.trim());
      setStep(3);
    } else if (step === 3) {
      setStep("done");
    }
  }

  if (step === "done") {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Feather name="check" size={32} color={Colors.accentGreen} />
          </View>
          <Text style={styles.doneTitle}>Tool adicionada!</Text>
          <Text style={styles.doneSub}>
            <Text style={{ color: Colors.accentGreen }}>{toolName}</Text> foi cadastrada no seu perfil
            como {available ? "disponível" : "indisponível"}.
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={() => { setStep(1); setToolType(""); setToolName(""); setQuery(""); setDetails(""); setAvailable(true); }}>
            <Feather name="plus" size={14} color={Colors.accentGreen} />
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
    <View style={[styles.container, { paddingTop: topPadding + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Feather name="arrow-left" size={18} color={Colors.accentGreen} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepIndicator}>
            Passo {currentStep} de {TOTAL_STEPS}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Que tipo de tool?</Text>
            <Text style={styles.stepSub}>
              Selecione a categoria que melhor descreve o que você vai adicionar.
            </Text>

            <View style={styles.typeGrid}>
              {TOOL_TYPES.map((t) => (
                <Pressable
                  key={t.id}
                  style={[
                    styles.typeCard,
                    toolType === t.id && styles.typeCardSelected,
                  ]}
                  onPress={() => setToolType(t.id)}
                >
                  <View style={[
                    styles.typeIcon,
                    toolType === t.id
                      ? { backgroundColor: Colors.accentGreen + "20", borderColor: Colors.accentGreen + "40" }
                      : { backgroundColor: "#161616", borderColor: "#1e1e1e" },
                  ]}>
                    <Feather
                      name={t.icon}
                      size={22}
                      color={toolType === t.id ? Colors.accentGreen : "#444"}
                    />
                  </View>
                  <Text style={[
                    styles.typeLabel,
                    toolType === t.id && styles.typeLabelSelected,
                  ]}>
                    {t.label}
                  </Text>
                  <Text style={styles.typeDescription}>{t.description}</Text>
                  {toolType === t.id && (
                    <View style={styles.typeCheck}>
                      <Feather name="check" size={11} color={Colors.accentGreen} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>
              Nome da {TOOL_TYPES.find((t) => t.id === toolType)?.label.toLowerCase() ?? "tool"}
            </Text>
            <Text style={styles.stepSub}>
              Escreva o nome ou escolha uma sugestão da lista.
            </Text>

            <View style={styles.inputWrap}>
              <Feather name="search" size={15} color="#444" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  setToolName(t);
                }}
                placeholder="Buscar ou escrever..."
                placeholderTextColor="#333"
                autoCapitalize="words"
              />
              {query.length > 0 && (
                <Pressable onPress={() => { setQuery(""); setToolName(""); }}>
                  <Feather name="x" size={15} color="#444" />
                </Pressable>
              )}
            </View>

            {query.length === 0 && (
              <View style={styles.chipsSection}>
                <Text style={styles.chipsLabel}>SUGESTÕES</Text>
                <View style={styles.chips}>
                  {suggestions.map((s) => (
                    <Pressable key={s} style={styles.chip} onPress={() => handleSelectSuggestion(s)}>
                      <Text style={styles.chipText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {filtered.length > 0 && (
              <View style={styles.suggestionList}>
                {filtered.map((s) => (
                  <Pressable
                    key={s}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(s)}
                  >
                    <Feather name="box" size={13} color={Colors.accentGreen} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {query.length > 0 && filtered.length === 0 && (
              <View style={styles.freeTextHint}>
                <Feather name="plus-circle" size={13} color="#555" />
                <Text style={styles.freeTextHintText}>
                  Usar "<Text style={{ color: "#fff" }}>{query}</Text>" como nome
                </Text>
              </View>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>Detalhes</Text>
            <Text style={styles.stepSub}>
              Adicione informações extras sobre{" "}
              <Text style={{ color: Colors.accentGreen }}>{toolName}</Text> e defina a disponibilidade.
            </Text>

            <TextInput
              style={styles.textarea}
              value={details}
              onChangeText={setDetails}
              placeholder="Ex: cor, capacidade, modelo, ano, condição..."
              placeholderTextColor="#333"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.availCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.availTitle}>Disponível agora</Text>
                <Text style={styles.availSub}>
                  {available
                    ? "Esta tool aparecerá como disponível no perfil."
                    : "Esta tool aparecerá como indisponível."}
                </Text>
              </View>
              <Switch
                value={available}
                onValueChange={setAvailable}
                trackColor={{ false: "#1e1e1e", true: Colors.accentGreen + "60" }}
                thumbColor={available ? Colors.accentGreen : "#444"}
              />
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom action */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          style={[
            styles.primaryBtn,
            { flex: 1 },
            ((step === 1 && !toolType) || (step === 2 && !toolName.trim() && !query.trim())) &&
              styles.primaryBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={
            (step === 1 && !toolType) ||
            (step === 2 && !toolName.trim() && !query.trim())
          }
        >
          <Text style={styles.primaryBtnText}>
            {step === 3 ? "Concluir" : "Próximo"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  backBtn: {
    padding: 4,
    flexShrink: 0,
  },
  stepIndicator: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#161616",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.accentGreen,
    borderRadius: 2,
  },

  content: {
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    color: "#fff",
    marginBottom: 8,
  },
  stepSub: {
    fontFamily: "Sora_400Regular",
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    marginBottom: 24,
  },

  typeGrid: {
    gap: 10,
  },
  typeCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 18,
    position: "relative",
  },
  typeCardSelected: {
    borderColor: Colors.accentGreen + "40",
    backgroundColor: Colors.accentGreen + "08",
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  typeLabel: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  typeLabelSelected: {
    color: "#fff",
  },
  typeDescription: {
    fontFamily: "Sora_400Regular",
    fontSize: 12,
    color: "#444",
    lineHeight: 18,
  },
  typeCheck: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accentGreen + "20",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "40",
    alignItems: "center",
    justifyContent: "center",
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 20,
  },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#fff",
  },

  chipsSection: { marginBottom: 10 },
  chipsLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "25",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: Colors.accentGreen,
  },

  suggestionList: {
    gap: 2,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#0e0e0e",
  },
  suggestionText: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#ccc",
  },

  freeTextHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  freeTextHintText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
  },

  textarea: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    padding: 16,
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#fff",
    minHeight: 120,
    lineHeight: 22,
    marginBottom: 16,
  },

  availCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  availTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
    marginBottom: 3,
  },
  availSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    lineHeight: 15,
  },

  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#0e0e0e",
  },
  primaryBtn: {
    backgroundColor: Colors.accentGreen,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.35,
  },
  primaryBtnText: {
    fontFamily: "Sora_700Bold",
    fontSize: 14,
    color: "#060606",
  },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accentGreen + "12",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "30",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: Colors.accentGreen,
  },

  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentGreen + "15",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  doneTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
    color: "#fff",
    textAlign: "center",
  },
  doneSub: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
});
