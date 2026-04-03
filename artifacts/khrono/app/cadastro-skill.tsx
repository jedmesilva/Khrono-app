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

import { useTheme } from "@/context/ThemeContext";

const SKILL_SUGGESTIONS = [
  "Eletricista",
  "Encanador",
  "Pintor",
  "Montador de Móveis",
  "Jardineiro",
  "Personal Trainer",
  "Cozinheiro",
  "Pedreiro",
  "Marceneiro",
  "Técnico em TI",
  "Designer de Interiores",
  "Babá",
  "Cuidador de Idosos",
  "Motorista",
  "Fotógrafo",
];

const TOTAL_STEPS = 2;

type Step = 1 | 2 | "done";

export default function CadastroSkillScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [step, setStep] = useState<Step>(1);
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");

  const filtered =
    query.length > 0
      ? SKILL_SUGGESTIONS.filter((s) =>
          s.toLowerCase().includes(query.toLowerCase())
        )
      : [];

  const currentStep = step === "done" ? TOTAL_STEPS : (step as number);
  const progress = currentStep / TOTAL_STEPS;

  function handleSelectSuggestion(name: string) {
    setSkillName(name);
    setQuery(name);
  }

  function handleNext() {
    if (step === 1) {
      const name = skillName || query;
      if (!name.trim()) return;
      setSkillName(name.trim());
      setStep(2);
    } else if (step === 2) {
      setStep("done");
    }
  }

  function handleSkipDescription() {
    setStep("done");
  }

  if (step === "done") {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Feather name="check" size={32} color={"#ff6b35"} />
          </View>
          <Text style={styles.doneTitle}>Skill adicionada!</Text>
          <Text style={styles.doneSub}>
            <Text style={{ color: "#ff6b35" }}>{skillName}</Text> foi cadastrada no seu perfil.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Ver perfil</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => (step === 1 ? router.back() : setStep(1))}>
          <Feather name="arrow-left" size={18} color={"#ff6b35"} />
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
            <Text style={styles.stepTitle}>Qual é a sua skill?</Text>
            <Text style={styles.stepSub}>
              Escolha uma da lista ou escreva o nome da sua skill.
            </Text>

            <View style={styles.inputWrap}>
              <Feather name="search" size={15} color="#444" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  setSkillName(t);
                }}
                placeholder="Buscar skill..."
                placeholderTextColor="#333"
                autoCapitalize="words"
              />
              {query.length > 0 && (
                <Pressable onPress={() => { setQuery(""); setSkillName(""); }}>
                  <Feather name="x" size={15} color="#444" />
                </Pressable>
              )}
            </View>

            {query.length === 0 && (
              <View style={styles.chipsSection}>
                <Text style={styles.chipsLabel}>SUGESTÕES</Text>
                <View style={styles.chips}>
                  {SKILL_SUGGESTIONS.slice(0, 8).map((s) => (
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
                    <Feather name="tool" size={13} color={"#ff6b35"} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {query.length > 0 && filtered.length === 0 && (
              <View style={styles.freeTextHint}>
                <Feather name="plus-circle" size={13} color="#555" />
                <Text style={styles.freeTextHintText}>
                  Usar "<Text style={{ color: "#fff" }}>{query}</Text>" como nome da skill
                </Text>
              </View>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>Descreva sua skill</Text>
            <Text style={styles.stepSub}>
              Conte brevemente o que você faz com <Text style={{ color: "#ff6b35" }}>{skillName}</Text>.
              Isso é opcional.
            </Text>

            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: realizo montagem de móveis de todos os tipos, com ferramentas próprias..."
              placeholderTextColor="#333"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        {step === 2 && (
          <Pressable style={styles.skipBtn} onPress={handleSkipDescription}>
            <Text style={styles.skipBtnText}>pular</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.primaryBtn,
            { flex: 1 },
            step === 1 && !skillName.trim() && !query.trim() && styles.primaryBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={step === 1 && !skillName.trim() && !query.trim()}
        >
          <Text style={styles.primaryBtnText}>
            {step === 2 ? "Concluir" : "Próximo"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: "#ff6b35",
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
    borderColor: "#ff6b3525",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#ff6b35",
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
    minHeight: 140,
    lineHeight: 22,
  },

  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#0e0e0e",
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#555",
  },
  primaryBtn: {
    backgroundColor: "#ff6b35",
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
    color: "#fff",
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
    backgroundColor: "#ff6b3515",
    borderWidth: 1,
    borderColor: "#ff6b3530",
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
