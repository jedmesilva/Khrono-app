import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Feather name="arrow-left" size={18} color={Colors.accent} />
      </Pressable>
      <Text style={styles.title}>Contrato {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  back: { marginBottom: 20 },
  title: { fontFamily: "Sora_700Bold", fontSize: 20, color: "#fff" },
});
