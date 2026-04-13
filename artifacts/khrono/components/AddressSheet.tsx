import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, ColorPalette } from "@/context/ThemeContext";

const HISTORY_KEY = "@khrono_address_history";
const MAX_HISTORY = 8;
const DEBOUNCE_MS = 420;
const ORANGE = "#e06030";

export type AddressResult = {
  label: string;
  fullLabel: string;
  lat: number;
  lng: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: AddressResult) => void;
  title?: string;
  placeholder?: string;
};

async function loadHistory(): Promise<AddressResult[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveToHistory(address: AddressResult): Promise<void> {
  try {
    const current = await loadHistory();
    const deduped = current.filter((h) => h.label !== address.label);
    const updated = [address, ...deduped].slice(0, MAX_HISTORY);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

async function searchNominatim(query: string): Promise<AddressResult[]> {
  const encoded = encodeURIComponent(query);
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encoded}&format=json&countrycodes=br&limit=6&addressdetails=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Khrono App (khrono@app.br)" },
  });
  if (!res.ok) return [];
  const data: any[] = await res.json();

  return data.map((item) => {
    const addr = item.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    const state = addr.state || "";
    const label =
      city && state ? `${city}, ${state}` : item.display_name.split(",")[0].trim();
    return {
      label,
      fullLabel: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
  });
}

type ListItem =
  | { type: "suggestion"; data: AddressResult }
  | { type: "history"; data: AddressResult }
  | { type: "section"; title: string }
  | { type: "empty" };

export function AddressSheet({
  visible,
  onClose,
  onSelect,
  title = "Endereço",
  placeholder = "Ex: Belo Horizonte, MG",
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [history, setHistory] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery("");
      setSuggestions([]);
      setLoading(false);
      loadHistory().then(setHistory);
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchNominatim(query.trim());
      setSuggestions(results);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback(
    async (address: AddressResult) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await saveToHistory(address);
      setHistory((prev) => {
        const deduped = prev.filter((h) => h.label !== address.label);
        return [address, ...deduped].slice(0, MAX_HISTORY);
      });
      onSelect(address);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }, []);

  const handleShow = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const listItems: ListItem[] = useMemo(() => {
    const isTyping = query.trim().length >= 2;

    if (isTyping) {
      if (loading) return [{ type: "empty" }];
      if (suggestions.length === 0) return [{ type: "empty" }];
      return suggestions.map((s) => ({ type: "suggestion", data: s }));
    }

    if (history.length === 0) return [{ type: "empty" }];
    return [
      { type: "section", title: "Recentes" },
      ...history.map((h): ListItem => ({ type: "history", data: h })),
    ];
  }, [query, loading, suggestions, history]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "empty") {
        const isTyping = query.trim().length >= 2;
        return (
          <View style={styles.emptyWrap}>
            {loading ? (
              <ActivityIndicator size="small" color={ORANGE} />
            ) : isTyping ? (
              <>
                <Feather name="search" size={28} color={colors.textDim} />
                <Text style={styles.emptyText}>Nenhum endereço encontrado</Text>
                <Text style={styles.emptySubText}>Tente ser mais específico</Text>
              </>
            ) : (
              <>
                <Feather name="clock" size={28} color={colors.textDim} />
                <Text style={styles.emptyText}>Sem buscas recentes</Text>
                <Text style={styles.emptySubText}>
                  Os endereços que você pesquisar aparecerão aqui
                </Text>
              </>
            )}
          </View>
        );
      }

      if (item.type === "section") {
        return (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Pressable onPress={handleClearHistory} hitSlop={8}>
              <Text style={styles.clearText}>Limpar</Text>
            </Pressable>
          </View>
        );
      }

      const isHistory = item.type === "history";
      const addr = item.data;

      return (
        <Pressable
          style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
          onPress={() => handleSelect(addr)}
        >
          <View style={[styles.resultIcon, isHistory && styles.resultIconHistory]}>
            <Feather
              name={isHistory ? "clock" : "map-pin"}
              size={14}
              color={isHistory ? colors.textMuted : ORANGE}
            />
          </View>
          <View style={styles.resultTexts}>
            <Text style={styles.resultLabel} numberOfLines={1}>
              {addr.label}
            </Text>
            <Text style={styles.resultFull} numberOfLines={1}>
              {addr.fullLabel}
            </Text>
          </View>
          <Feather name="chevron-right" size={14} color={colors.chevron} />
        </Pressable>
      );
    },
    [query, loading, colors, styles, handleSelect, handleClearHistory]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      onShow={handleShow}
      statusBarTranslucent
    >
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.sheetBg }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Safe area top + header */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            hitSlop={8}
          >
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Search input */}
        <View style={styles.inputWrap}>
          <Feather
            name="search"
            size={16}
            color={query.length > 0 ? ORANGE : colors.textMuted}
          />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.textDim}
            style={[styles.input, { color: colors.text }]}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoFocus
          />
          {loading && (
            <ActivityIndicator size="small" color={ORANGE} style={{ marginLeft: 4 }} />
          )}
          {!loading && query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Results list */}
        <FlatList
          data={listItems}
          keyExtractor={(item, i) =>
            item.type === "section"
              ? "section"
              : item.type === "empty"
              ? "empty"
              : `${item.type}-${i}`
          }
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    title: {
      fontFamily: "Sora_700Bold",
      fontSize: 18,
      color: colors.text,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    closeBtnPressed: {
      backgroundColor: colors.rowPressed,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 4,
      paddingHorizontal: 14,
      height: 50,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 14,
    },
    input: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 15,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      paddingVertical: 10,
    },
    sectionTitle: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    clearText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      color: ORANGE,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 13,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    resultRowPressed: {
      backgroundColor: colors.rowPressed,
      borderRadius: 12,
    },
    resultIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#e0603012",
      borderWidth: 1,
      borderColor: "#e0603025",
      flexShrink: 0,
    },
    resultIconHistory: {
      backgroundColor: colors.menuIconBg,
      borderColor: colors.cardBorder,
    },
    resultTexts: {
      flex: 1,
      gap: 2,
    },
    resultLabel: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: colors.text,
    },
    resultFull: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.textMuted,
    },
    emptyWrap: {
      alignItems: "center",
      paddingTop: 48,
      gap: 10,
    },
    emptyText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 6,
    },
    emptySubText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 32,
    },
  });
}
