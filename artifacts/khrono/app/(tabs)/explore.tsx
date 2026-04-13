import { Feather } from "@expo/vector-icons";
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
import { formatRateValue } from "@/lib/format";

const EXPLORE_USERS = [
  { id: "1", name: "Felipe Andrade", initials: "FA", skills: ["Montador de Móveis", "Carregador"], rating: 4.9, reviews: 28, ratePerHour: 60, location: "Belo Horizonte, MG", available: true },
  { id: "2", name: "Bruno Souza", initials: "BS", skills: ["Consultoria de Redes Sociais", "Designer"], rating: 4.7, reviews: 15, ratePerHour: 80, location: "São Paulo, SP", available: true },
  { id: "3", name: "Mariana Costa", initials: "MC", skills: ["Encanadora", "Azulejista"], rating: 4.8, reviews: 34, ratePerHour: 90, location: "Rio de Janeiro, RJ", available: false },
  { id: "4", name: "Rafael Lima", initials: "RL", skills: ["Eletricista"], rating: 5.0, reviews: 21, ratePerHour: 70, location: "Belo Horizonte, MG", available: true },
  { id: "5", name: "Ana Pereira", initials: "AP", skills: ["Cuidadora de Crianças", "Cuidadora de Idosos"], rating: 4.6, reviews: 19, ratePerHour: 45, location: "Curitiba, PR", available: true },
];

const CATEGORIES = [
  { icon: "tool" as const, label: "Reparos" },
  { icon: "home" as const, label: "Casa" },
  { icon: "activity" as const, label: "Saúde" },
  { icon: "monitor" as const, label: "Tech" },
  { icon: "truck" as const, label: "Transporte" },
  { icon: "book" as const, label: "Educação" },
];

export default function ExploreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const filtered = EXPLORE_USERS.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.skills.some((s) => s.toLowerCase().includes(q));
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 20, paddingBottom: isWeb ? 34 + 84 + 20 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Explorar</Text>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar skills ou pessoas..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catContent}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.label}
              style={[
                styles.catChip,
                { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                activeCategory === cat.label && styles.catChipActive,
              ]}
              onPress={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
            >
              <Feather name={cat.icon} size={14} color={activeCategory === cat.label ? "#fff" : colors.textSecondary} />
              <Text style={[styles.catLabel, { color: colors.textSecondary }, activeCategory === cat.label && { color: "#fff" }]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{filtered.length} DISPONÍVEIS</Text>

        <View style={styles.cardList}>
          {filtered.map((u) => (
            <View key={u.id} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.userCardTop}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{u.initials}</Text>
                  </View>
                  <View style={[styles.availDot, { backgroundColor: u.available ? "#18a06b" : colors.textDim, borderColor: colors.card }]} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>{u.name}</Text>
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={10} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>{u.location}</Text>
                  </View>
                </View>
                <View style={styles.rateWrap}>
                  <Text style={styles.rateText}>{formatRateValue(u.ratePerHour)}</Text>
                  <Text style={[styles.rateUnit, { color: colors.textSecondary }]}>/h</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillScroll}>
                {u.skills.map((s) => (
                  <View key={s} style={[styles.skillChip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <Text style={[styles.skillLabel, { color: colors.textSecondary }]}>{s}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.cardFooter}>
                <View style={styles.ratingRow}>
                  <Feather name="star" size={11} color="#e06030" />
                  <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{u.rating} · {u.reviews} avaliações</Text>
                </View>
                <Pressable style={[styles.hireBtn, { opacity: u.available ? 1 : 0.4 }]} disabled={!u.available}>
                  <Text style={styles.hireBtnText}>Contratar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  pageTitle: { fontFamily: "Sora_700Bold", fontSize: 26, letterSpacing: -0.5 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  searchInput: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 13 },
  catScroll: { marginBottom: 24 },
  catContent: { gap: 8 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  catChipActive: { backgroundColor: "#e0603020", borderColor: "#e0603050" },
  catLabel: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  sectionLabel: { fontFamily: "DMSans_400Regular", fontSize: 9, letterSpacing: 2, marginBottom: 14 },
  cardList: { gap: 12 },
  userCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  userCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#e0603018", borderWidth: 1.5, borderColor: "#e0603035",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: "#e06030" },
  availDot: { position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  userInfo: { flex: 1 },
  userName: { fontFamily: "Sora_600SemiBold", fontSize: 14, marginBottom: 2 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  rateWrap: { flexDirection: "row", alignItems: "baseline" },
  rateText: { fontFamily: "DMSans_500Medium", fontSize: 16, color: "#e06030" },
  rateUnit: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  skillScroll: {},
  skillChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6 },
  skillLabel: { fontFamily: "DMSans_400Regular", fontSize: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  ratingText: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  hireBtn: { backgroundColor: "#e06030", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  hireBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 12, color: "#fff" },
});
