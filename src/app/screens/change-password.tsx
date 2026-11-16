import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { toast } from "sonner-native";
import CurvedHeader from "../../components/CurvedHeader";
import PrimaryButton from "../../components/PrimaryButton";
import { authApi } from "../../features/auth/services/authApi";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isLoggedIn = useAuthStore((state) => state.isAuthenticated);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      toast.info("Please sign in to change your password");
      router.replace("/(auth)/login" as any);
    }
  }, [isLoggedIn]);

  const hasMinLength = newPassword.length >= 8;
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter your new password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (!hasNumberOrSpecial) {
      toast.error("New password must contain at least one number or special character");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      router.back();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Failed to update password";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      className="flex-1 bg-neutral-50"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <StatusBar style="light" />

      {/* Curved Navy Header with Back Button */}
      <CurvedHeader title={t("change_password.title")} showBackButton />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card Container */}
          <View className="bg-white rounded-3xl p-5 mx-4 mt-6 border border-neutral-100 shadow-sm">
            <Text className="text-neutral-900 font-bold text-lg mb-1">
              {t("change_password.heading")}
            </Text>
            <Text className="text-neutral-500 text-sm mb-5 leading-5">
              {t("change_password.subheading")}
            </Text>

            <View className="gap-y-5">
              {/* Current Password */}
              <View className="relative mt-2">
                <View className="flex-row items-center border border-neutral-300 rounded-2xl px-4 py-3.5 bg-white">
                  <Feather name="lock" size={18} color="#ea580c" />
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder={t("change_password.enter_current_password")}
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showCurrentPassword}
                    className="flex-1 ml-2.5 text-neutral-900 text-base font-medium py-0"
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Feather
                      name={showCurrentPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <View className="absolute -top-2.5 left-4 bg-white px-1.5 z-10">
                  <Text className="text-neutral-600 text-xs font-semibold">
                    {t("change_password.current_password")}
                  </Text>
                </View>
              </View>

              {/* New Password */}
              <View className="relative mt-2">
                <View className="flex-row items-center border border-neutral-300 rounded-2xl px-4 py-3.5 bg-white">
                  <Feather name="lock" size={18} color="#ea580c" />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t("change_password.enter_new_password")}
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showNewPassword}
                    className="flex-1 ml-2.5 text-neutral-900 text-base font-medium py-0"
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Feather
                      name={showNewPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <View className="absolute -top-2.5 left-4 bg-white px-1.5 z-10">
                  <Text className="text-neutral-600 text-xs font-semibold">
                    {t("change_password.new_password")}
                  </Text>
                </View>
              </View>

              {/* Confirm New Password */}
              <View className="relative mt-2">
                <View className="flex-row items-center border border-neutral-300 rounded-2xl px-4 py-3.5 bg-white">
                  <Feather name="lock" size={18} color="#ea580c" />
                  <TextInput
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder={t("change_password.confirm_new_password")}
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmNewPassword}
                    className="flex-1 ml-2.5 text-neutral-900 text-base font-medium py-0"
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() =>
                      setShowConfirmNewPassword(!showConfirmNewPassword)
                    }
                  >
                    <Feather
                      name={showConfirmNewPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <View className="absolute -top-2.5 left-4 bg-white px-1.5 z-10">
                  <Text className="text-neutral-600 text-xs font-semibold">
                    {t("change_password.confirm_new_password")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Password Criteria Checklist */}
            <View className="mt-5 pt-4 border-t border-neutral-100 gap-y-2">
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    hasMinLength
                      ? "checkmark-circle"
                      : "checkmark-circle-outline"
                  }
                  size={18}
                  color={hasMinLength ? "#16a34a" : "#9ca3af"}
                />
                <Text
                  className={`ml-2 text-sm ${
                    hasMinLength
                      ? "text-emerald-700 font-semibold"
                      : "text-neutral-500 font-normal"
                  }`}
                >
                  {t("change_password.req_length")}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons
                  name={
                    hasNumberOrSpecial
                      ? "checkmark-circle"
                      : "checkmark-circle-outline"
                  }
                  size={18}
                  color={hasNumberOrSpecial ? "#16a34a" : "#9ca3af"}
                />
                <Text
                  className={`ml-2 text-sm ${
                    hasNumberOrSpecial
                      ? "text-emerald-700 font-semibold"
                      : "text-neutral-500 font-normal"
                  }`}
                >
                  Contains a number or special character
                </Text>
              </View>
            </View>
          </View>

          {/* Change Password CTA Button */}
          <View className="px-4 mt-8 mb-4">
            <PrimaryButton
              title={isSubmitting ? t("change_password.updating") : t("change_password.update_password")}
              onPress={handleChangePassword}
              loading={isSubmitting}
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
