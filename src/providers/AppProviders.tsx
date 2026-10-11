import React, { useEffect } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { I18nextProvider } from "react-i18next";
import i18n from "../locales";
import { useUserLocation } from "../features/location/hooks/useUserLocation";
import { tokenService } from "../features/auth/services/tokenService";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const queryClient = new QueryClient();

function LocationInitializer() {
  useUserLocation(true);
  return null;
}

function AuthInitializer() {
  useEffect(() => {
    tokenService.loadTokens();
  }, []);
  return null;
}

function NotificationInitializer() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    import("../features/notifications/services/pushNotificationService").then(
      ({ setupNotificationListeners }) => {
        cleanupFn = setupNotificationListeners();
      }
    );
    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    import("../features/notifications/services/pushNotificationService").then(
      ({ syncPushTokenWithBackend }) => {
        syncPushTokenWithBackend().catch((error) => {
          console.warn("[PUSH] Failed to sync push token:", error);
        });
      }
    );
  }, [isAuthenticated]);

  return null;
}

function AppStateInitializer() {
  useEffect(() => {
    const persistState = (state: string) => {
      AsyncStorage.setItem("citydeals-app-state", state).catch(() => {});
    };

    persistState(AppState.currentState);
    const subscription = AppState.addEventListener("change", persistState);

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

interface AppProvidersProps {
  children: React.ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <AuthInitializer />
            <AppStateInitializer />
            <LocationInitializer />
            <NotificationInitializer />
            {children}
            <Toaster />
          </QueryClientProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

