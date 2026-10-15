import { LogBox } from "react-native";
import { Stack } from "expo-router";
import AppProviders from "../providers/AppProviders";
import "../global.css";
import "../locales";
import "../features/location/services/backgroundLocationTask";

LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="screens/coupon-details"
          options={{
            presentation: "card",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen name="screens/account" />
        <Stack.Screen name="screens/change-password" />
        <Stack.Screen name="screens/help-support" />
        <Stack.Screen name="screens/terms-of-use" />
        <Stack.Screen name="deals/[id]" />
      </Stack>
    </AppProviders>
  );
}
