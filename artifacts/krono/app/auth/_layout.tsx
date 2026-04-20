import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router";

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="login" />
      <Stack.Screen name="verificacao" />
      <Stack.Screen name="senha" />
      <Stack.Screen name="nome" />
      <Stack.Screen name="boas-vindas" options={{ animation: "fade", gestureEnabled: false }} />
    </Stack>
  );
}
