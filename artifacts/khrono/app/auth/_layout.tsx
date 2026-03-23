import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#060606" },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="verificacao" />
      <Stack.Screen name="senha" />
      <Stack.Screen name="nome" />
      <Stack.Screen name="boas-vindas" options={{ animation: "fade", gestureEnabled: false }} />
    </Stack>
  );
}
