import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import { DMMono_400Regular } from "@expo-google-fonts/dm-mono";
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
import { StripeProvider } from "@stripe/stripe-react-native";

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
import { AvailabilityProvider } from "@/context/AvailabilityContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { ToastProvider } from "@/context/ToastContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppReadyManager({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (fontsReady && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, authLoading]);

  return null;
}

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";
    const inRootEntry = segments.length === 0 || segments[0] === "index";
    const inSignupFlow = ["boas-vindas", "senha", "nome", "verificacao", "nova-senha", "codigo-recuperacao"].includes(segments[1] as string);

    if (!isAuthenticated && !inAuthGroup && !inRootEntry) {
      router.replace("/auth");
    } else if (isAuthenticated && ((inAuthGroup && !inSignupFlow) || inRootEntry)) {
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
    DMMono_400Regular,
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  if (!fontsReady) return null;

  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StripeProvider
              publishableKey={stripeKey}
              urlScheme="krono"
              merchantIdentifier="merchant.com.krono.app"
            >
            <ThemeProvider>
              <BottomSheetModalProvider>
                <AuthProvider>
                  <AppReadyManager fontsReady={fontsReady} />
                  <UserSettingsProvider>
                  <NotificationsProvider>
                    <AvailabilityProvider>
                      <LocationProvider>
                        <CatalogProvider>
                          <UserCatalogProvider>
                            <ContractsProvider>
                              <WalletProvider>
                                <ConfirmationProvider>
                                  <DocumentsProvider>
                                    <ServicesProvider>
                                      <ToastProvider>
                                        <RootLayoutNav />
                                      </ToastProvider>
                                    </ServicesProvider>
                                  </DocumentsProvider>
                                </ConfirmationProvider>
                              </WalletProvider>
                            </ContractsProvider>
                          </UserCatalogProvider>
                        </CatalogProvider>
                      </LocationProvider>
                    </AvailabilityProvider>
                  </NotificationsProvider>
                  </UserSettingsProvider>
                </AuthProvider>
              </BottomSheetModalProvider>
            </ThemeProvider>
            </StripeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
