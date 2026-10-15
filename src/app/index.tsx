import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Redirect, router, useRootNavigationState } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import PrimaryButton from "../components/PrimaryButton";
import { LANGUAGES } from "../config/constants";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { useShallow } from "zustand/react/shallow";
import { changeAppLanguage } from "../locales";
import { useTranslation } from "react-i18next";

export default function LanguageSelectionScreen() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, isHydrated, onboardingCompleted } =
    useAuthStore(
      useShallow((state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        isHydrated: state.isHydrated,
        onboardingCompleted: state.onboardingCompleted,
      }))
    );

  const rootNavigationState = useRootNavigationState();

  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || "en");

  // 1. Wait for persisted storage to load and navigation to be ready before deciding route
  if (!isHydrated || !rootNavigationState?.key) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  // 2. If already logged in: bypass language & onboarding, jump straight into (tabs)
  if (isAuthenticated && user) {
    return <Redirect href="/(tabs)" />;
  }

  // 3. If onboarding was already completed before, direct to login
  if (onboardingCompleted) {
    return <Redirect href="/(auth)/login" />;
  }

  const handleSelectLanguage = async (code: string) => {
    setSelectedLanguage(code);
    await changeAppLanguage(code);
  };

  const handleContinue = async () => {
    await changeAppLanguage(selectedLanguage);
    router.push("/onboarding" as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-between">
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 24,
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <View style={{ maxWidth: 460, width: "100%", alignSelf: "center", flex: 1, justifyContent: "space-between" }}>
          {/* Header Section */}
        <View>
          {/* Centered Logo */}
          <View className="items-center mb-8">
            <Image
              source={require("../../assets/images/city-deals-logo.png")}
              className="h-12 w-44"
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center mb-4 border border-orange-100">
              <MaterialCommunityIcons
                name="translate"
                size={30}
                color="#ea580c"
              />
            </View>
            <Text className="text-2xl font-extrabold text-neutral-900 text-center tracking-tight">
              {t("language.choose_title")}
            </Text>
            <Text className="text-neutral-500 text-base text-center mt-2 max-w-xs leading-6">
              {t("language.choose_desc")}
            </Text>
          </View>

          {/* Language Options */}
          <View className="gap-y-3.5">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.id;
              return (
                <TouchableOpacity
                  key={lang.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectLanguage(lang.id)}
                  className={`flex-row items-center justify-between px-5 h-16 rounded-2xl border ${
                    isSelected
                      ? "bg-orange-50 border-orange-500"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`w-12 h-12 rounded-2xl items-center justify-center mr-3.5 ${
                        isSelected ? "bg-orange-100" : "bg-neutral-100 border border-neutral-200"
                      }`}
                    >
                      <Text className="text-2xl">
                        {lang.flag}
                      </Text>
                    </View>
                    <View>
                      <Text
                        className={`font-bold text-lg ${
                          isSelected ? "text-orange-600" : "text-neutral-900"
                        }`}
                      >
                        {lang.name}
                      </Text>
                      <Text className="text-neutral-500 text-base">
                        {lang.nativeName}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center border ${
                      isSelected
                        ? "bg-orange-500 border-orange-500"
                        : "border-neutral-300 bg-white"
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action CTA Button */}
        <View className="pt-6">
          <PrimaryButton
            title={t("common.continue")}
            onPress={handleContinue}
          />
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
