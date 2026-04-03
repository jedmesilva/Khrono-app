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

const EXPLORE_USERS = [
  {
    id: "1",
    name: "Felipe Andrade",
    initials: "FA",
    skills: ["Montador de Móveis", "Carregador"],
    rating: 4.9,
    reviews: 28,
    ratePerHour: 60,
    location: "Belo Horizonte, MG",
    available: true,
  },
  {
    id: "2",
    name: "Bruno Souza",
    initials: "BS",
    skills: ["Consultoria de Redes Sociais", "Designer"],
    rating: 4.7,
    reviews: 15,
    ratePerHour: 80,
    location: "São Paulo, SP",
    available: true,
  },
  {
    id: "3",
    name: "Mariana Costa",
    initials: "MC",
    skills: ["Encanadora", "Azulejista"],
    rating: 4.8,
    reviews: 34,
    ratePerHour: 90,
    location: "Rio de Janeiro, RJ",
    available: false,
  },
  {
    id: "4",
    name: "Rafael Lima",
    initials: "RL",
    skills: ["Eletricista"],
    rating: 5.0,
    reviews: 21,
    ratePerHour: 70,
    location: "Belo Horizonte, MG",
    available: true,
  },
  {
    id: "5",
    name: "Ana Pereira",
    initials: "AP",
    skills: ["Cuidadora de Crianças", "Cuidadora de Idosos"],
    rating: 4.6,
    reviews: 19,
    ratePerHour: 45,
    location: "Curitiba, PR",
    available: true,
  },
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
    return (
      u.name.toLowerCase().includes(q) ||
      u.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <View style={styles.header}>
          <Text style={styles.logo}>
            K<Text style={{ color: "#ff6b35" }}>r</Text>ono
          </Text>
          <Text style={styles.subtitle}>explorar</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#555" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar skills ou pessoas..."
            placeholderTextColor="#444"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={14} color="#444" />
            </Pressable>
          )}
        </View>

        {/* Categories */}
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
                activeCategory === cat.label && styles.catChipActive,
              ]}
              onPress={() =>
                setActiveCategory(activeCategory === cat.label ? null : cat.label)
              }
            >
              <Feather
                name={cat.icon}
                size={14}
                color={activeCategory === cat.label ? "#fff" : "#555"}
              />
              <Text
                style={[
                  styles.catLabel,
                  activeCategory === cat.label && { color: "#fff" },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Section label */}
        <Text style={styles.sectionLabel}>
          {filtered.length} DISPONÍVEIS
        </Text>

        {/* User cards */}
        <View style={styles.cardList}>
          {filtered.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.userCardTop}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{u.initials}</Text>
                  </View>
                  <View
                    style={[
                      styles.availDot,
                      {
                        backgroundColor: u.available
                          ? "#00e5a0"
                          : "#333",
                      },
                    ]}
                  />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <View style={styles.locationRow}>
                    <Feather name="map-pin" size={10} color="#555" />
                    <Text style={styles.locationText}>{u.location}</Text>
                  </View>
                </View>
                <View style={styles.rateWrap}>
                  <Text style={styles.rateText}>R${u.ratePerHour}</Text>
                  <Text style={styles.rateUnit}>/h</Text>
                </View>
              </View>

              {/* Skills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.skillScroll}
              >
                {u.skills.map((s) => (
                  <View key={s} style={styles.skillChip}>
                    <Text style={styles.skillLabel}>{s}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.ratingRow}>
                  <Feather name="star" size={11} color={"#ff6b35"} />
                  <Text style={styles.ratingText}>
                    {u.rating} · {u.reviews} avaliações
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.hireBtn,
                    { opacity: u.available ? 1 : 0.4 },
                  ]}
                  disabled={!u.available}
                >
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: "#fff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#fff",
  },
  catScroll: { marginBottom: 24 },
  catContent: { gap: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  catChipActive: {
    backgroundColor: "#ff6b3520",
    borderColor: "#ff6b3550",
  },
  catLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
  },
  sectionLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 2,
    marginBottom: 14,
  },
  cardList: { gap: 12 },
  userCard: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  userCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ff6b3518",
    borderWidth: 1.5,
    borderColor: "#ff6b3535",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    color: "#ff6b35",
  },
  availDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#0a0a0a",
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#555",
  },
  rateWrap: { flexDirection: "row", alignItems: "baseline" },
  rateText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 16,
    color: "#ff6b35",
  },
  rateUnit: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#666",
  },
  skillScroll: {},
  skillChip: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  skillLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#666",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ratingText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
  },
  hireBtn: {
    backgroundColor: "#ff6b35",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hireBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
});
