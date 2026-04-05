import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Service, Skill, Tool, VerificationType } from "../constants/profile-data";

interface ServiceCardProps {
  service: Service;
  skill: Skill | undefined;
  tools: Tool[];
  active: boolean;
  colors: {
    card: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textDim: string;
    surface: string;
    surfaceBorder: string;
    divider: string;
  };
  onPress: () => void;
  onVerifiedPress?: (type: VerificationType, context: string) => void;
}

export function ServiceCard({ service, skill, tools, active, colors, onPress, onVerifiedPress }: ServiceCardProps) {
  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: active ? 1 : 0.45 }]}
      onPress={onPress}
    >
      {/* Badge ativo / inativo */}
      <View style={[styles.statusBadge, { backgroundColor: active ? "#00e5a018" : colors.surface, borderColor: active ? "#00e5a035" : colors.surfaceBorder }]}>
        <View style={[styles.statusDot, { backgroundColor: active ? "#00e5a0" : colors.textDim }]} />
        <Text style={[styles.statusText, { color: active ? "#00e5a0" : colors.textDim }]}>
          {active ? "ativo" : "inativo"}
        </Text>
      </View>

      {/* Ícone grande */}
      <View style={[styles.iconBlock, { backgroundColor: active ? "#ff6b35" : colors.surface }]}>
        <Feather name="layers" size={32} color={active ? "#fff" : colors.textMuted} />
      </View>

      {/* Título */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {service.name}
      </Text>

      {/* Tags: categoria + verificado */}
      <View style={styles.tagsRow}>
        {skill?.type && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{skill.type}</Text>
          </View>
        )}
        {service.verified && (
          <Pressable
            style={styles.verifiedTag}
            onPress={() => onVerifiedPress?.(service.verified!.type, "service")}
          >
            <Feather name="check-circle" size={12} color="#00e5a0" />
            <Text style={styles.verifiedTagText}>Verificado</Text>
          </Pressable>
        )}
      </View>

      {/* Skills */}
      {skill && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textDim }]}>Skills</Text>
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>{skill.name}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tools */}
      {tools.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textDim }]}>Tools</Text>
          <View style={styles.chipsRow}>
            {tools.map((t) => (
              <View key={t.id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>{t.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.divider }]}>
        <View style={styles.priceBlock}>
          <Text style={[styles.price, { color: active ? "#ff6b35" : colors.textMuted }]}>R${service.hourlyRate}</Text>
          <Text style={[styles.perHour, { color: colors.textDim }]}>/hora</Text>
        </View>
        {!service.isNew ? (
          <Text style={[styles.contractsCount, { color: colors.textMuted }]}>
            {service.contracts} {service.contracts === 1 ? "Contrato" : "Contratos"}
          </Text>
        ) : (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>novo</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    position: "relative",
  },
  statusBadge: {
    position: "absolute",
    top: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  iconBlock: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 17,
    lineHeight: 24,
    paddingRight: 72,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryTag: {
    backgroundColor: "#ff6b3512",
    borderWidth: 1,
    borderColor: "#ff6b3530",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  categoryTagText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
    color: "#ff6b35",
    letterSpacing: 0.3,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#00e5a012",
    borderWidth: 1,
    borderColor: "#00e5a030",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  verifiedTagText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
    color: "#00e5a0",
    letterSpacing: 0.3,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    maxWidth: 160,
  },
  footer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 14,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  price: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
  },
  perHour: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
  },
  contractsCount: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
  },
  newBadge: {
    backgroundColor: "#00e5a015",
    borderWidth: 1,
    borderColor: "#00e5a025",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#00e5a0",
  },
});
