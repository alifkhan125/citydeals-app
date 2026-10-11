import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toast } from "sonner-native";
import CurvedHeader from "../../components/CurvedHeader";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { useCurrentUser } from "../../features/auth/hooks/useCurrentUser";
import { useUpdateNotificationSettings } from "../../features/notifications/hooks/useNotifications";
import { syncPushTokenWithBackend } from "../../features/notifications/services/pushNotificationService";

const RADIUS_PRESETS = [
  {
    label: "55m",
    value: 55,
    title: "Very close",
    description: "Only alert me around the exact street or building.",
    icon: "walk-outline" as const,
  },
  {
    label: "500m",
    value: 500,
    title: "Nearby block",
    description: "Good for short walks and quick local offers.",
    icon: "navigate-outline" as const,
  },
  {
    label: "1km",
    value: 1000,
    title: "Neighborhood",
    description: "A balanced range for nearby restaurants and shops.",
    icon: "location-outline" as const,
  },
  {
    label: "2km",
    value: 2000,
    title: "Recommended",
    description: "Best default for most nearby deal notifications.",
    icon: "radio-outline" as const,
  },
  {
    label: "5km",
    value: 5000,
    title: "Wider area",
    description: "Show more deals while moving around the city.",
    icon: "map-outline" as const,
  },
];

function formatRadius(value: number) {
  if (value < 1000) return `${value}m`;
  return `${value / 1000}km`;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storedUser = useAuthStore((state) => state.user);
  const { data: currentUser } = useCurrentUser();
  const user = currentUser || storedUser;
  const updateSettings = useUpdateNotificationSettings();
  const [customRadius, setCustomRadius] = useState("2");
  const [customUnit, setCustomUnit] = useState<"m" | "km">("km");

  const notificationsEnabled = Boolean(isAuthenticated && !user?.notificationsPaused);
  const selectedRadius = user?.notificationRadiusMeters ?? 2000;

  const saveSettings = async (next: {
    notificationsPaused?: boolean;
    notificationRadiusMeters?: number;
  }) => {
    if (!isAuthenticated) {
      router.push("/(auth)/login" as any);
      return;
    }

    const notificationsPaused = next.notificationsPaused ?? Boolean(user?.notificationsPaused);
    const notificationRadiusMeters =
      next.notificationRadiusMeters ?? user?.notificationRadiusMeters ?? 2000;

    updateSettings.mutate(
      { notificationsPaused, notificationRadiusMeters },
      {
        onSuccess: async () => {
          await AsyncStorage.removeItem("notified_deals").catch(() => null);
          if (!notificationsPaused) {
            await syncPushTokenWithBackend().catch(() => null);
            const { startBackgroundLocationTracking } = await import(
              "../../features/location/services/backgroundLocationTask"
            );
            await startBackgroundLocationTracking(true).catch(() => null);
          }
          toast.success("Notification settings updated");
        },
        onError: (error: any) => {
          const message = error?.response?.data?.message || error?.message || "Could not update settings";
          toast.error(Array.isArray(message) ? message[0] : message);
        },
      }
    );
  };

  const saveCustomRadius = () => {
    const parsed = Number(customRadius.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid radius");
      return;
    }

    const meters = Math.round(customUnit === "km" ? parsed * 1000 : parsed);
    if (meters < 1) {
      toast.error("Minimum radius is 1m");
      return;
    }
    if (meters > 50000) {
      toast.error("Maximum radius is 50km");
      return;
    }

    saveSettings({ notificationRadiusMeters: meters });
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />
      <CurvedHeader title="Notification Settings" showBackButton />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 42 }}
      >
      

        <View className="mx-4 mt-4 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-orange-50">
                  <Feather name="bell" size={20} color="#ea580c" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-extrabold text-neutral-900">
                    Push notifications
                  </Text>
                  <Text className="mt-0.5 text-xs text-neutral-500">
                    Nearby deals, saved coupon updates, and important alerts.
                  </Text>
                </View>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              disabled={updateSettings.isPending}
              onValueChange={(enabled) => {
                saveSettings({ notificationsPaused: !enabled });
              }}
              trackColor={{ false: "#e2e8f0", true: "#ea580c" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View className="px-5 pb-2 pt-6">
          <Text className="text-lg font-black text-neutral-900">
            Notification radius
          </Text>
          <Text className="mt-1 text-sm leading-5 text-neutral-500">
            Current range: {formatRadius(selectedRadius)} from your latest location.
          </Text>
        </View>

        <View className="mx-4 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
          <View className="flex-row items-start">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-orange-50">
              <MaterialCommunityIcons
                name="tune-variant"
                size={22}
                color="#ea580c"
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-neutral-900">
                Custom radius
              </Text>
              <Text className="mt-1 text-xs leading-5 text-neutral-500">
                Type your own distance in meters or kilometers.
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center">
            <TextInput
              value={customRadius}
              onChangeText={(value) => setCustomRadius(value.replace(/[^0-9.,]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="Enter radius"
              placeholderTextColor="#94a3b8"
              className="h-12 flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-base font-bold text-neutral-900"
            />
            <View className="ml-2 flex-row rounded-2xl bg-neutral-100 p-1">
              {(["m", "km"] as const).map((unit) => {
                const isSelected = customUnit === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    activeOpacity={0.85}
                    onPress={() => setCustomUnit(unit)}
                    className={`h-10 min-w-12 items-center justify-center rounded-xl px-3 ${
                      isSelected ? "bg-orange-500" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`text-sm font-extrabold ${
                        isSelected ? "text-white" : "text-neutral-500"
                      }`}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-neutral-500">
              Range: {formatRadius(Math.round((Number(customRadius.replace(",", ".")) || 0) * (customUnit === "km" ? 1000 : 1)))}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={updateSettings.isPending}
              onPress={saveCustomRadius}
              className="rounded-2xl bg-orange-500 px-5 py-3 disabled:opacity-50"
            >
              <Text className="text-sm font-extrabold text-white">
                Save radius
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mx-4 mt-4 rounded-3xl border border-neutral-100 bg-white p-3 shadow-sm">
          {RADIUS_PRESETS.map((preset, index) => {
            const isSelected = selectedRadius === preset.value;
            return (
              <TouchableOpacity
                key={preset.value}
                activeOpacity={0.82}
                disabled={updateSettings.isPending}
                onPress={() => saveSettings({ notificationRadiusMeters: preset.value })}
                className={`flex-row items-center rounded-2xl p-3 ${
                  isSelected ? "bg-orange-50" : "bg-white"
                } ${index > 0 ? "mt-1.5" : ""}`}
              >
                <View
                  className={`h-12 w-12 items-center justify-center rounded-2xl ${
                    isSelected ? "bg-orange-500" : "bg-neutral-100"
                  }`}
                >
                  <Ionicons
                    name={preset.icon}
                    size={22}
                    color={isSelected ? "#ffffff" : "#64748b"}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-base font-extrabold text-neutral-900">
                      {preset.label}
                    </Text>
                    {preset.value === 2000 && (
                      <View className="ml-2 rounded-full bg-[#0f3455] px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-white">
                          BEST
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-0.5 text-xs font-semibold text-neutral-700">
                    {preset.title}
                  </Text>
                  <Text className="mt-0.5 text-xs leading-4 text-neutral-500">
                    {preset.description}
                  </Text>
                </View>
                <View
                  className={`ml-3 h-6 w-6 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-orange-500 bg-orange-500"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {isSelected && <Feather name="check" size={14} color="#ffffff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="mx-4 mt-4 flex-row rounded-3xl border border-orange-100 bg-orange-50 p-4">
          <MaterialCommunityIcons
            name="map-marker-radius-outline"
            size={24}
            color="#ea580c"
          />
          <View className="ml-3 flex-1">
            <Text className="font-extrabold text-neutral-900">
              How radius works
            </Text>
            <Text className="mt-1 text-xs leading-5 text-neutral-600">
              CityDeals uses your latest saved location and only sends nearby deal alerts inside your selected range.
            </Text>
          </View>
        </View>

        {updateSettings.isPending && (
          <View className="mt-5 flex-row items-center justify-center">
            <ActivityIndicator color="#ea580c" />
            <Text className="ml-2 text-sm font-semibold text-neutral-500">
              Saving settings...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
