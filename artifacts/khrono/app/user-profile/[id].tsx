import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog } from "@/components/AppDialog";
import { formatRadius } from "@/components/LocationSheet";
import { useTheme } from "@/context/ThemeContext";
import { PROVIDERS, VERIFICATION_LABELS, VerificationType, ProviderProfile } from "@/constants/profile-data";

function PulsingDot({ size = 8 }: { size?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  React.useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.5, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
    opacity.value = withRepeat(withSequence(withTiming(0.1, { duration: 900 }), withTiming(0.6, { duration: 900 })), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <View style={{ width: size * 2.5, height: size * 2.5, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: size * 2, height: size * 2, borderRadius: size, backgroundColor: "#00e5a040" }, ringStyle]} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#00e5a0" }} />
    </View>
  );
}

function ServiceAreaCard({ provider, colors }: { provider: ProviderProfile; colors: any }) {
  const isRealtime = provider.locationMode === "realtime";
  const isAvailable = provider.distancia <= provider.serviceRadius / 1000;

  return (
    <View style={[areaStyles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={areaStyles.topRow}>
        <View style={[areaStyles.iconWrap, isRealtime ? { backgroundColor: "#00e5a015", borderColor: "#00e5a025" } : { backgroundColor: "#ff6b3515", borderColor: "#ff6b3525" }]}>
          {isRealtime ? <PulsingDot size={7} /> : <Feather name="map-pin" size={14} color="#ff6b35" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[areaStyles.areaLabel, { color: colors.textSecondary }]}>Área de atendimento</Text>
          <Text style={[areaStyles.areaDesc, { color: colors.textMuted }]}>
            {isRealtime ? "Localização em tempo real" : provider.fixedAddress || "Localização fixa"}
            {" · raio "}{formatRadius(provider.serviceRadius)}
          </Text>
        </View>
        <View style={[areaStyles.availBadge, isAvailable ? { backgroundColor: "#00e5a015", borderColor: "#00e5a030" } : { backgroundColor: "#ff3b3015", borderColor: "#ff3b3030" }]}>
          <View style={[areaStyles.availDot, { backgroundColor: isAvailable ? "#00e5a0" : "#ff3b30" }]} />
          <Text style={[areaStyles.availText, { color: isAvailable ? "#00e5a0" : "#ff3b30" }]}>
            {isAvailable ? "Disponível" : "Fora da área"}
          </Text>
        </View>
      </View>
      {!isAvailable && (
        <View style={areaStyles.warningRow}>
          <Feather name="alert-circle" size={11} color="#ff3b30" />
          <Text style={areaStyles.warningText}>
            Você está a {provider.distancia.toFixed(1)} km,{" "}
            {isRealtime ? "fora da localização atual deste profissional" : `fora da área de atendimento em ${provider.fixedAddress || "localização fixa"}`}{" "}
            (raio {formatRadius(provider.serviceRadius)}).
          </Text>
        </View>
      )}
    </View>
  );
}

const areaStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 28, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  areaLabel: { fontFamily: "Sora_600SemiBold", fontSize: 12, marginBottom: 2 },
  areaDesc: { fontFamily: "DMMono_400Regular", fontSize: 11 },
  availBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, flexShrink: 0 },
  availDot: { width: 5, height: 5, borderRadius: 3 },
  availText: { fontFamily: "DMMono_500Medium", fontSize: 10 },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "#ff3b3010", borderWidth: 1, borderColor: "#ff3b3020", borderRadius: 10, padding: 10 },
  warningText: { flex: 1, fontFamily: "DMMono_400Regular", fontSize: 10, color: "#ff3b30cc", lineHeight: 15 },
});

export default function UserProfileScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const [dialog, setDialog] = useState<{ title: string; message?: string } | null>(null);
  const provider = PROVIDERS.find((p) => p.id === id);

  if (!provider) {
    return (
      <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Perfil não encontrado.</Text>
      </View>
    );
  }

  function handleVerifiedPress(type: VerificationType) {
    setDialog({
      title: VERIFICATION_LABELS[type],
      message: type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
        : type === "community" ? "Verificado por avaliações da comunidade de usuários."
        : "Verificação em análise pela equipe Krono.",
    });
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding + 20, backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#ff6b35" />
          </Pressable>
          <Text style={[styles.screenLabel, { color: colors.textMuted }]}>perfil</Text>
        </View>

        {/* Avatar + name */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{provider.initials}</Text>
            </View>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{provider.name}</Text>
          <View style={[styles.statsRow, { borderTopColor: colors.surface }]}>
            {[
              { val: String(provider.totalContracts), label: "contratos" },
              { val: String(provider.services.length), label: "services" },
              { val: `${provider.distancia} km`, label: "distância" },
            ].map((item, i, arr) => (
              <React.Fragment key={item.label}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.val}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{item.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.surface }]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <ServiceAreaCard provider={provider} colors={colors} />

        {/* Services */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>services</Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {provider.services.map((service) => {
            const skill = provider.skills.find((s) => s.id === service.skillId);
            const tools = provider.tools.filter((t) => service.toolIds.includes(t.id));
            return (
              <Pressable
                key={service.id}
                style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push(`/provider-service/${service.id}?profileId=${provider.id}` as any)}
              >
                <View style={styles.serviceTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.serviceName, { color: colors.text }]}>{service.name}</Text>
                    <View style={styles.serviceMeta}>
                      {!service.isNew ? (
                        <>
                          <Feather name="star" size={10} color="#ff6b35" />
                          <Text style={[styles.serviceMetaText, { color: colors.textSecondary }]}>{service.rating.toFixed(1)} · {service.reviews} avaliações</Text>
                          <Text style={[styles.serviceMetaDot, { color: colors.textDim }]}>·</Text>
                          <Text style={[styles.serviceMetaText, { color: colors.textSecondary }]}>{service.contracts} contratos</Text>
                        </>
                      ) : (
                        <Text style={[styles.serviceMetaText, { color: colors.textMuted }]}>novo service</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.serviceRate}>R${service.hourlyRate}/h</Text>
                    <Feather name="chevron-right" size={14} color={colors.chevron} />
                  </View>
                </View>
                <View style={styles.serviceComposition}>
                  {skill && (
                    <View style={styles.compositionChip}>
                      <Feather name="star" size={9} color="#ff6b35" />
                      <Text style={styles.compositionChipText}>{skill.name}</Text>
                    </View>
                  )}
                  {tools.map((tool) => (
                    <View key={tool.id} style={[styles.compositionChip, styles.compositionChipGreen]}>
                      <Feather name="key" size={9} color="#00e5a0" />
                      <Text style={[styles.compositionChipText, { color: "#00e5a0cc" }]}>{tool.name}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Skills */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>skills</Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {provider.skills.map((skill) => (
            <View key={skill.id} style={[styles.skillCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.skillHeader}>
                <View style={styles.skillIconWrap}>
                  <Feather name="star" size={13} color="#ff6b35" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.skillNameRow}>
                    <Text style={styles.skillName}>{skill.name}</Text>
                    {skill.verified && (
                      <Pressable style={styles.verifiedBadge} onPress={() => skill.verified && handleVerifiedPress(skill.verified.type)}>
                        <Feather name="check-circle" size={9} color="#4a9eff" />
                        <Text style={styles.verifiedBadgeText}>Verificado</Text>
                      </Pressable>
                    )}
                    {skill.isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>novo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.skillDesc, { color: colors.textSecondary }]}>{skill.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Tools */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>tools</Text>
        <View style={{ gap: 10, marginBottom: 40 }}>
          {provider.tools.map((tool) => (
            <View key={tool.id} style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.toolIconWrap}>
                <Feather name={tool.icon === "truck" ? "truck" : tool.icon === "tool" ? "tool" : "box"} size={14} color="#00e5a0" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.toolNameRow}>
                  <Text style={styles.toolName}>{tool.name}</Text>
                  {tool.verified && (
                    <Pressable style={styles.verifiedBadge} onPress={() => tool.verified && handleVerifiedPress(tool.verified.type)}>
                      <Feather name="check-circle" size={9} color="#4a9eff" />
                      <Text style={styles.verifiedBadgeText}>Verificado</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={[styles.toolType, { color: colors.textMuted }]}>{tool.type}</Text>
                <Text style={[styles.toolDetails, { color: colors.textSecondary }]}>{tool.details}</Text>
              </View>
              <View style={[styles.availDot, { backgroundColor: tool.available ? "#00e5a0" : colors.textDim }]} />
            </View>
          ))}
        </View>
      </ScrollView>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} onDismiss={() => setDialog(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  errorText: { fontFamily: "Sora_400Regular", fontSize: 14, marginTop: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
  backBtn: { padding: 4, flexShrink: 0 },
  screenLabel: { fontFamily: "DMMono_400Regular", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  profileCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 14 },
  avatarWrap: { marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#ff6b3515", borderWidth: 2, borderColor: "#ff6b3530", alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Sora_700Bold", fontSize: 24, color: "#ff6b35" },
  profileName: { fontFamily: "Sora_700Bold", fontSize: 20, marginBottom: 8, textAlign: "center" },
  statsRow: { flexDirection: "row", alignItems: "center", width: "100%", paddingTop: 16, borderTopWidth: 1 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 28 },
  statValue: { fontFamily: "DMMono_500Medium", fontSize: 14 },
  statLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  sectionLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  serviceCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  serviceTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  serviceName: { fontFamily: "Sora_600SemiBold", fontSize: 14, marginBottom: 4 },
  serviceMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  serviceMetaText: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  serviceMetaDot: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  serviceRate: { fontFamily: "DMMono_500Medium", fontSize: 13, color: "#ff6b35" },
  serviceComposition: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  compositionChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ff6b3510", borderWidth: 1, borderColor: "#ff6b3520", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  compositionChipGreen: { backgroundColor: "#00e5a010", borderColor: "#00e5a020" },
  compositionChipText: { fontFamily: "DMMono_400Regular", fontSize: 9, color: "#ff6b35cc" },
  skillCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  skillHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  skillIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#ff6b3525", backgroundColor: "#ff6b3510", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  skillNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  skillName: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#ff6b35dd" },
  skillDesc: { fontFamily: "Sora_400Regular", fontSize: 11, lineHeight: 16 },
  newBadge: { backgroundColor: "#1a2a1a", borderWidth: 1, borderColor: "#00e5a030", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  newBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 9, color: "#00e5a0" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0d1f33", borderWidth: 1, borderColor: "#1a3a5c", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  verifiedBadgeText: { fontFamily: "DMMono_500Medium", fontSize: 9, color: "#4a9eff" },
  toolCard: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  toolIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: "#00e5a025", backgroundColor: "#00e5a010", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  toolNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 },
  toolName: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#00e5a0dd" },
  toolType: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  toolDetails: { fontFamily: "Sora_400Regular", fontSize: 11 },
  availDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4, flexShrink: 0 },
});
