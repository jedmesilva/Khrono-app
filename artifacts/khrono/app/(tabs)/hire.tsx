import { useTheme } from "@/context/ThemeContext";
import { StyleSheet, View } from "react-native";

export default function HireScreen() {
  const { colors } = useTheme();
  return <View style={[styles.container, { backgroundColor: colors.background }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
