import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from "@expo-google-fonts/sora";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CatalogProvider } from "@/context/CatalogContext";
import { WalletProvider } from "@/context/WalletContext";
import { ContractsProvider } from "@/context/ContractsContext";
import { ConfirmationProvider } from "@/context/ConfirmationContext";
import { DocumentsProvider } from "@/context/DocumentsContext";
import { ServicesProvider } from "@/context/ServicesContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserCatalogProvider } from "@/context/UserCatalogContext";
import { LocationProvider } from "@/context/LocationContext";
import { UserSettingsProvider } from "@/context/UserSettingsContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";
    const inSignupFlow = ["boas-vindas", "senha", "nome", "verificacao", "nova-senha", "codigo-recuperacao"].includes(segments[1] as string);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/auth");
    } else if (isAuthenticated && inAuthGroup && !inSignupFlow) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="skill/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="contract-detail/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="contract-confirm"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="conta"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="cadastro-skill"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="cadastro-tool"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="service/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="verificacao-facial"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="envio-documento"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="definicoes"
          options={{ headerShown: false, presentation: "card" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <BottomSheetModalProvider>
                <AuthProvider>
                  <UserSettingsProvider>
                    <LocationProvider>
                      <CatalogProvider>
                        <UserCatalogProvider>
                          <ContractsProvider>
                            <WalletProvider>
                              <ConfirmationProvider>
                                <DocumentsProvider>
                                  <ServicesProvider>
                                    <RootLayoutNav />
                                  </ServicesProvider>
                                </DocumentsProvider>
                              </ConfirmationProvider>
                            </WalletProvider>
                          </ContractsProvider>
                        </UserCatalogProvider>
                      </CatalogProvider>
                    </LocationProvider>
                  </UserSettingsProvider>
                </AuthProvider>
              </BottomSheetModalProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
