import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Service, Skill, Tool, VerificationType } from "../constants/profile-data";

interface ServiceCardProps {
  service: Service;
  skills: Skill[];
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

export function ServiceCard({ service, skills, tools, active, colors, onPress, onVerifiedPress }: ServiceCardProps) {
  const primaryCategory = skills[0]?.type ?? null;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: active ? 1 : 0.45 }]}
      onPress={onPress}
    >
      <View style={[styles.statusBadge, { backgroundColor: active ? "#18a06b18" : colors.surface, borderColor: active ? "#18a06b35" : colors.surfaceBorder }]}>
        <View style={[styles.statusDot, { backgroundColor: active ? "#18a06b" : colors.textDim }]} />
        <Text style={[styles.statusText, { color: active ? "#18a06b" : colors.textDim }]}>
          {active ? "ativo" : "inativo"}
        </Text>
      </View>

      <View style={[styles.iconBlock, { backgroundColor: active ? "#e06030" : colors.surface }]}>
        <Feather name="layers" size={32} color={active ? "#fff" : colors.textMuted} />
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {service.name}
      </Text>

      <View style={styles.tagsRow}>
        {primaryCategory && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{primaryCategory}</Text>
          </View>
        )}
        {service.verified && (
          <Pressable
            style={styles.verifiedTag}
            onPress={() => onVerifiedPress?.(service.verified!.type, "service")}
          >
            <Feather name="check-circle" size={12} color="#18a06b" />
            <Text style={styles.verifiedTagText}>Verificado</Text>
          </Pressable>
        )}
      </View>

      {skills.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textDim }]}>Skills</Text>
          <View style={styles.chipsRow}>
            {skills.map((sk) => (
              <View key={sk.id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>{sk.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

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

      <View style={[styles.footer, { borderTopColor: colors.divider }]}>
        <View style={styles.priceBlock}>
          <Text style={[styles.price, { color: active ? "#e06030" : colors.textMuted }]}>R${service.hourlyRate}</Text>
          <Text style={[styles.perHour, { color: colors.textDim }]}>/hora</Text>
        </View>
        {!service.isNew ? (
          <Text style={[styles.contractsCount, { color: colors.textMuted }]}>
            {service.contracts} contrato{service.contracts !== 1 ? "s" : ""}
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
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  iconBlock: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryTag: {
    backgroundColor: "#e0603018",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  categoryTagText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#e06030",
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#18a06b15",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  verifiedTagText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#18a06b",
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 160,
  },
  chipText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 2,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  price: {
    fontFamily: "Sora_700Bold",
    fontSize: 22,
  },
  perHour: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  contractsCount: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
  },
  newBadge: {
    backgroundColor: "#18a06b15",
    borderWidth: 1,
    borderColor: "#18a06b25",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    color: "#18a06b",
  },
});
