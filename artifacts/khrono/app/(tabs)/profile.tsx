import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { LocationSheet, LocationMode } from "@/components/LocationSheet";
import Colors from "@/constants/colors";

type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;

const MY_PROFILE = {
  name: "Jedme Silva",
  initials: "JS",
  location: "Belo Horizonte, MG",
  totalContracts: 43,
  since: "Mar 2024",
  baseRate: 50,
  pinCode: "1257",
  tools: [
    {
      id: "t1",
      name: "Honda Civic 2019",
      type: "Veículo",
      icon: "truck" as const,
      details: "Prata · 4 portas · Ar condicionado",
      available: true,
    },
    {
      id: "t2",
      name: "Kit Furadeira Bosch",
      type: "Ferramenta",
      icon: "tool" as const,
      details: "Furadeira + bits + nível + parafusadeira",
      available: true,
    },
    {
      id: "t3",
      name: "Carrinho de Mudança",
      type: "Equipamento",
      icon: "box" as const,
      details: "Capacidade 200kg · Com cintas",
      available: false,
    },
  ],
  skills: [
    {
      id: "s1",
      name: "Montador de Móveis",
      multiplier: 1.0,
      rating: 4.9,
      reviews: 28,
      contracts: 31,
      isNew: false,
      reviewsList: [
        { author: "Bruno Souza", rating: 5, text: "Excelente trabalho, montou tudo rápido e com cuidado.", date: "08/11/2024" },
        { author: "Ana Pereira", rating: 5, text: "Super recomendo, muito profissional.", date: "01/11/2024" },
        { author: "Rafael Lima", rating: 4, text: "Bom trabalho, pontual e organizado.", date: "20/10/2024" },
      ],
    },
    {
      id: "s2",
      name: "Carregador / Mudanças",
      multiplier: 0.8,
      rating: 4.7,
      reviews: 12,
      contracts: 12,
      isNew: false,
      reviewsList: [
        { author: "Mariana Costa", rating: 5, text: "Cuidadoso com os móveis, ótimo serviço.", date: "05/10/2024" },
        { author: "Felipe Andrade", rating: 4, text: "Chegou no horário, serviço bem feito.", date: "22/09/2024" },
      ],
    },
    {
      id: "s3",
      name: "Pintor",
      multiplier: 1.5,
      rating: 0,
      reviews: 0,
      contracts: 0,
      isNew: true,
      reviewsList: [],
    },
  ],
};

type Skill = typeof MY_PROFILE.skills[0];

function SkillDetail({ skill, baseRate, onBack }: { skill: Skill; baseRate: number; onBack: () => void }) {
  const [tab, setTab] = useState<"reviews" | "activity">("reviews");
  const rate = baseRate * skill.multiplier;

  return (
    <View style={styles.skillDetailContainer}>
      {/* Back header */}
      <View style={styles.skillDetailHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <View style={styles.skillDetailInfo}>
          <Text style={styles.skillDetailName}>{skill.name}</Text>
          {!skill.isNew ? (
            <View style={styles.ratingRowSmall}>
              <Feather name="star" size={10} color={Colors.accent} />
              <Text style={styles.ratingTextSmall}>
                {skill.rating} · {skill.reviews} avaliações · {skill.contracts} contratos
              </Text>
            </View>
          ) : (
            <Text style={styles.newSkillTag}>skill nova · sem atividade ainda</Text>
          )}
          <View style={styles.rateRow}>
            <Text style={styles.skillRate}>R${rate.toFixed(0)}/h</Text>
            <View style={styles.multiplierBadge}>
              <Text style={styles.multiplierText}>{skill.multiplier}x</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["reviews", "activity"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "reviews" ? "Avaliações" : "Atividade"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
        {skill.isNew ? (
          <View style={styles.emptyState}>
            <Feather name="clock" size={28} color="#333" />
            <Text style={styles.emptyText}>nenhuma atividade ainda</Text>
            <Text style={styles.emptySubtext}>os registros aparecerão após o primeiro contrato</Text>
          </View>
        ) : tab === "reviews" ? (
          <View style={styles.reviewList}>
            {skill.reviewsList.map((r, i) => (
              <View key={i} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{r.author}</Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Feather
                        key={s}
                        name="star"
                        size={10}
                        color={Colors.accent}
                        style={{ opacity: s <= r.rating ? 1 : 0.2 }}
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewText}>{r.text}</Text>
                <Text style={styles.reviewDate}>{r.date}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={28} color="#333" />
            <Text style={styles.emptyText}>histórico de contratos em breve</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>("realtime");
  const [fixedAddress, setFixedAddress] = useState("Belo Horizonte, MG");
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const avgRating =
    MY_PROFILE.skills.filter((s) => s.rating > 0).reduce((sum, s) => sum + s.rating, 0) /
      MY_PROFILE.skills.filter((s) => s.rating > 0).length || 0;

  if (selectedSkill) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: Colors.background, paddingTop: topPadding + 20 },
        ]}
      >
        <SkillDetail
          skill={selectedSkill}
          baseRate={MY_PROFILE.baseRate}
          onBack={() => setSelectedSkill(null)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding + 20,
            paddingBottom: isWeb ? 34 + 84 + 20 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            K<Text style={{ color: Colors.accent }}>r</Text>ono
          </Text>
          <Text style={styles.headerSub}>perfil</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{MY_PROFILE.initials}</Text>
            </View>
            <Pressable style={styles.editBtn}>
              <Feather name="edit-2" size={10} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{MY_PROFILE.name}</Text>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color="#555" />
              <Text style={styles.locationText}>{MY_PROFILE.location}</Text>
            </View>
            <Text style={styles.sinceText}>membro desde {MY_PROFILE.since}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{MY_PROFILE.totalContracts}</Text>
            <Text style={styles.statLabel}>CONTRATOS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{MY_PROFILE.skills.length}</Text>
            <Text style={styles.statLabel}>SKILLS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>AVALIAÇÃO</Text>
          </View>
        </View>

        {/* Location card */}
        <Pressable
          style={styles.locationCard}
          onPress={() => setLocationSheetOpen(true)}
        >
          <View style={[
            styles.locationIconWrap,
            locationMode === "realtime"
              ? { backgroundColor: Colors.accentGreen + "15", borderColor: Colors.accentGreen + "30" }
              : { backgroundColor: Colors.accent + "15", borderColor: Colors.accent + "30" },
          ]}>
            <Feather
              name={locationMode === "realtime" ? "navigation" : "map-pin"}
              size={18}
              color={locationMode === "realtime" ? Colors.accentGreen : Colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.locationTopRow}>
              <Text style={styles.locationLabel}>Localização de serviço</Text>
              <View style={[
                styles.locationModeBadge,
                locationMode === "realtime"
                  ? { backgroundColor: Colors.accentGreen + "15", borderColor: Colors.accentGreen + "25" }
                  : { backgroundColor: Colors.accent + "15", borderColor: Colors.accent + "25" },
              ]}>
                <Text style={[
                  styles.locationModeBadgeText,
                  { color: locationMode === "realtime" ? Colors.accentGreen : Colors.accent },
                ]}>
                  {locationMode === "realtime" ? "Tempo real" : "Fixa"}
                </Text>
              </View>
            </View>
            <Text style={styles.locationAddress}>
              {locationMode === "realtime" ? `${fixedAddress} · GPS ativo` : fixedAddress}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#2a2a2a" />
        </Pressable>

        {/* Skills */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.sectionHeaderRight}>
              <View style={styles.baseBadge}>
                <Text style={styles.baseBadgeLabel}>base</Text>
                <Text style={styles.baseBadgeRate}>R${MY_PROFILE.baseRate}/h</Text>
              </View>
              <Pressable
                style={styles.addBtn}
                onPress={() => setDialog({ title: "Em breve", message: "Adicionar skills em breve." })}
              >
                <Feather name="plus" size={11} color="#555" />
                <Text style={styles.addBtnText}>adicionar</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.list}>
            {MY_PROFILE.skills.map((s) => (
              <Pressable
                key={s.id}
                style={styles.skillCard}
                onPress={() => setSelectedSkill(s)}
              >
                <View style={styles.skillIcon}>
                  <Feather
                    name="tool"
                    size={18}
                    color={s.isNew ? "#444" : Colors.accent}
                  />
                </View>
                <View style={styles.skillInfo}>
                  <View style={styles.skillNameRow}>
                    <Text style={styles.skillName}>{s.name}</Text>
                    {s.isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>novo</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.skillRateRow}>
                    <Text style={styles.skillRateText}>
                      R${(MY_PROFILE.baseRate * s.multiplier).toFixed(0)}/h
                    </Text>
                    <View style={styles.multiBadge}>
                      <Text style={styles.multiBadgeText}>{s.multiplier}x</Text>
                    </View>
                  </View>
                  {!s.isNew && (
                    <View style={styles.ratingRow}>
                      <Feather name="star" size={10} color={Colors.accent} />
                      <Text style={styles.ratingTextSm}>
                        {s.rating} · {s.reviews} avaliações
                      </Text>
                    </View>
                  )}
                </View>
                <Feather name="chevron-right" size={16} color="#2a2a2a" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tools */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tools</Text>
            <Pressable
              style={styles.addBtn}
              onPress={() => setDialog({ title: "Em breve", message: "Adicionar tools em breve." })}
            >
              <Feather name="plus" size={11} color="#555" />
              <Text style={styles.addBtnText}>adicionar</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {MY_PROFILE.tools.map((t) => (
              <View
                key={t.id}
                style={[styles.toolCard, { opacity: t.available ? 1 : 0.5 }]}
              >
                <View style={[styles.toolIcon, { borderColor: t.available ? Colors.accentGreen + "20" : "#1e1e1e" }]}>
                  <Feather
                    name={t.icon}
                    size={18}
                    color={t.available ? Colors.accentGreen : "#444"}
                  />
                </View>
                <View style={styles.toolInfo}>
                  <View style={styles.toolNameRow}>
                    <Text style={styles.toolName}>{t.name}</Text>
                    <View
                      style={[
                        styles.availBadge,
                        {
                          backgroundColor: t.available ? Colors.accentGreen + "15" : "#1e1e1e",
                          borderColor: t.available ? Colors.accentGreen + "25" : "#2a2a2a",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.availBadgeText,
                          { color: t.available ? Colors.accentGreen : "#444" },
                        ]}
                      >
                        {t.available ? "disponível" : "indisponível"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.toolType}>{t.type}</Text>
                  <Text style={styles.toolDetails}>{t.details}</Text>
                </View>
                <Pressable style={styles.editIconBtn}>
                  <Feather name="edit-2" size={14} color="#2a2a2a" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        buttons={dialog?.buttons}
        onDismiss={() => setDialog(null)}
      />

      <LocationSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        mode={locationMode}
        fixedAddress={fixedAddress}
        onSave={(mode, address) => {
          setLocationMode(mode);
          if (mode === "fixed") setFixedAddress(address);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  avatarSection: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#161616",
    borderWidth: 2,
    borderColor: Colors.accent + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 22,
    color: Colors.accent,
    fontWeight: "700",
  },
  editBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: "#060606",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1, paddingTop: 4 },
  profileName: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    color: "#fff",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  locationText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
  },
  sinceText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
  },
  statsCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  statItem: { alignItems: "center" },
  statValue: {
    fontFamily: "DMMono_500Medium",
    fontSize: 20,
    color: "#fff",
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 8,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  statDivider: { width: 1, height: 30, backgroundColor: "#1a1a1a" },
  locationCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  locationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  locationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  locationLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    flex: 1,
  },
  locationModeBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  locationModeBadgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  pinCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: Colors.accent + "20",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  pinCardLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#555",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pinCardCode: {
    fontFamily: "DMMono_500Medium",
    fontSize: 22,
    color: Colors.accent,
    letterSpacing: 4,
  },
  copyBtn: {
    padding: 8,
    backgroundColor: Colors.accent + "15",
    borderRadius: 10,
  },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  baseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  baseBadgeLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
  },
  baseBadgeRate: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
    color: Colors.accent,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtnText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
  },
  list: { gap: 10 },
  skillCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  skillIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: Colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  skillInfo: { flex: 1 },
  skillNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  skillName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  newBadge: {
    backgroundColor: Colors.accentGreen + "15",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "25",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  newBadgeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: Colors.accentGreen,
  },
  skillRateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  skillRateText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 12,
    color: Colors.accent,
  },
  multiBadge: {
    backgroundColor: Colors.accent + "10",
    borderWidth: 1,
    borderColor: Colors.accent + "20",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  multiBadgeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: Colors.accent + "80",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ratingTextSm: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#555",
  },
  toolCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  toolInfo: { flex: 1 },
  toolNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  toolName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  availBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  availBadgeText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
  },
  toolType: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    marginBottom: 2,
  },
  toolDetails: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
  },
  editIconBtn: { padding: 4, flexShrink: 0 },
  skillDetailContainer: { flex: 1 },
  skillDetailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: { padding: 4, marginTop: 2 },
  skillDetailInfo: { flex: 1 },
  skillDetailName: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  ratingRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  ratingTextSmall: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#666",
  },
  newSkillTag: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
    marginBottom: 6,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skillRate: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    color: Colors.accent,
  },
  multiplierBadge: {
    backgroundColor: Colors.accent + "15",
    borderWidth: 1,
    borderColor: Colors.accent + "25",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  multiplierText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: Colors.accent,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#1a1a1a",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabItemActive: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tabTextActive: {
    color: Colors.accent,
  },
  tabContent: { flex: 1, paddingHorizontal: 20 },
  reviewList: { gap: 10 },
  reviewCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 14,
    padding: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewAuthor: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  stars: { flexDirection: "row", gap: 2 },
  reviewText: {
    fontFamily: "Sora_400Regular",
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    marginBottom: 8,
  },
  reviewDate: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#333",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#333",
  },
  emptySubtext: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#222",
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 17,
  },
});
