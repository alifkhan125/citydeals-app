import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { useQueryClient } from "@tanstack/react-query";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import CurvedHeader from "../../components/CurvedHeader";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { authApi } from "../../features/auth/services/authApi";
import { useTranslation } from "react-i18next";

function getSafeImagePicker() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-image-picker");
  } catch (err) {
    console.warn("Native ExponentImagePicker module not found in this build:", err);
    return null;
  }
}

export default function AccountSettingScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [email] = useState(user?.email || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.dateOfBirth ? user.dateOfBirth.split("T")[0] : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName || "");
    setPhoneNumber(user?.phoneNumber || "");
    setDateOfBirth(user?.dateOfBirth ? user.dateOfBirth.split("T")[0] : "");
  }, [user?.dateOfBirth, user?.fullName, user?.phoneNumber]);

  const avatarUri =
    localAvatarUri ||
    user?.profilePictureUrl ||
    (user?.fullName
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.fullName
        )}&background=ea580c&color=ffffff&bold=true`
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80");

  const dateValue = useMemo(() => {
    if (dateOfBirth && dateOfBirth.includes("-")) {
      const parts = dateOfBirth.split("-").map(Number);
      if (
        parts.length >= 3 &&
        !isNaN(parts[0]) &&
        !isNaN(parts[1]) &&
        !isNaN(parts[2])
      ) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return new Date(2000, 0, 1);
  }, [dateOfBirth]);

  const handlePhotoTap = async () => {
    try {
      const ImagePicker = getSafeImagePicker();
      if (!ImagePicker || !ImagePicker.requestMediaLibraryPermissionsAsync) {
        toast.error("Photo picker requires rebuilding the app binary (run 'npx expo run:android').");
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.error("Photo permission is required to update your profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const selectedUri = result.assets[0].uri;
      // Keep the selected image visible while the upload is in progress.
      setLocalAvatarUri(selectedUri);
      setIsUploadingAvatar(true);
      const updatedUser = await authApi.uploadAvatar(selectedUri);
      useAuthStore.getState().updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Profile photo updated");
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Failed to update profile photo";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setIsDatePickerOpen(false);
    }
    if (event.type === "set" && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const formatted = `${year}-${month}-${day}`;
      setDateOfBirth(formatted);
    }
  };

  const handleSaveChange = async () => {
    if (!fullName.trim()) {
      toast.error(t("account.fullname_required"));
      return;
    }

    try {
      setIsSaving(true);

      let formattedDob: string | undefined = undefined;
      if (dateOfBirth.trim().length > 0) {
        const parsed = new Date(dateOfBirth.trim());
        if (isNaN(parsed.getTime())) {
          toast.error(t("account.dob_invalid"));
          setIsSaving(false);
          return;
        }
        formattedDob = parsed.toISOString();
      }

      const updatedUser = await authApi.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        dateOfBirth: formattedDob,
      });

      if (updatedUser) {
        useAuthStore.getState().updateUser(updatedUser);
      }

      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success(t("account.success_update"));
      router.back();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Failed to update profile";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />

      {/* Reusable Curved Header with Back Button */}
      <CurvedHeader title={t("account.title")} showBackButton />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View className="mx-4 mt-5 items-center rounded-3xl border border-orange-100 bg-white px-5 py-5 shadow-sm">
            <View className="relative" style={{ width: 112, height: 112 }}>
              <Image
                key={avatarUri}
                source={{ uri: avatarUri }}
                className="h-28 w-28 rounded-full border-4 border-orange-50 bg-neutral-200"
                style={{ width: 112, height: 112, borderRadius: 56 }}
                contentFit="cover"
                transition={150}
              />
              {isUploadingAvatar && (
                <View className="absolute inset-1 items-center justify-center rounded-full bg-black/35">
                  <ActivityIndicator color="#ffffff" size="small" />
                </View>
              )}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePhotoTap}
                disabled={isUploadingAvatar}
                accessibilityRole="button"
                accessibilityLabel={t("account.tap_to_change_photo")}
                style={{ position: "absolute", right: -2, bottom: -2 }}
                className="h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-orange-500 shadow-lg"
              >
                <Feather name="camera" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text className="mt-3 text-base font-bold text-[#0f3b5e]">{t("account.profile_photo", "Profile photo")}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePhotoTap}
              disabled={isUploadingAvatar}
              className="mt-2 flex-row items-center rounded-full bg-orange-50 px-4 py-2.5"
            >
              <Feather name="edit-2" size={14} color="#ea580c" />
              <Text className="ml-2 text-sm font-bold text-orange-600">
                {isUploadingAvatar ? "Uploading photo..." : t("account.tap_to_change_photo")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Personal Information Card */}
          <View className="bg-white rounded-3xl p-5 mx-4 mt-6 border border-neutral-100 shadow-sm">
            <Text className="text-neutral-900 font-bold text-lg mb-4">
              {t("account.personal_info")}
            </Text>

            <View className="gap-y-5">
              {/* Full Name Field */}
              <View className="relative mt-2">
                <View className="border border-neutral-300 rounded-2xl px-4 py-3.5 bg-white">
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder={t("account.full_name")}
                    placeholderTextColor="#9ca3af"
                    className="text-neutral-900 text-base font-medium py-0"
                  />
                </View>
                <View className="absolute -top-2.5 left-4 bg-white px-1.5 z-10">
                  <Text className="text-neutral-600 text-xs font-semibold">
                    {t("account.full_name")}
                  </Text>
                </View>
              </View>

              {/* Phone Number Field */}
              <View className="relative mt-2">
                <View className="border border-neutral-300 rounded-2xl px-4 py-3.5 bg-white">
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder={t("account.phone_number")}
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    className="text-neutral-900 text-base font-medium py-0"
                  />
                </View>
                <View className="absolute -top-2.5 left-4 bg-white px-1.5 z-10">
                  <Text className="text-neutral-600 text-xs font-semibold">
                    {t("account.phone_number")}
                  </Text>
                </View>
              </View>

              {/* Email Field (Read Only) */}
              <View className="relative mt-2">
                <View className="border border-neutral-200 rounded-2xl px-4 py-3.5 bg-neutral-100/70 flex-row items-center justify-between">
                  <TextInput
                    value={email}
                    editable={false}
                    placeholder="Email"
                    placeholderTextColor="#9ca3af"
                    className="text-neutral-500 text-base font-medium py-0 flex-1"
                  />
                  <Feather name="lock" size={15} color="#9ca3af" />
                </View>
                <View className="absolute -top-2.5 left-4 bg-white px-1.5 z-10">
                  <Text className="text-neutral-500 text-xs font-semibold">
                    {t("account.email_read_only")}
                  </Text>
                </View>
              </View>

              {/* Date of Birth Field */}
              <View className="relative mt-2">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsDatePickerOpen(true)}
                  className="border border-neutral-300 rounded-2xl px-4 py-3.5 bg-white flex-row items-center justify-between"
                >
                  <Text
                    className={`text-base font-medium ${
                      dateOfBirth ? "text-neutral-900" : "text-neutral-400"
                    }`}
                  >
                    {dateOfBirth || t("account.select_dob")}
                  </Text>
                  <Feather name="calendar" size={18} color="#ea580c" />
                </TouchableOpacity>
                <View className="absolute -top-2.5 left-4 bg-white px-1.5 z-10">
                  <Text className="text-neutral-600 text-xs font-semibold">
                    {t("account.date_of_birth")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Save Change CTA Button */}
          <View className="px-4 mt-8">
            <PrimaryButton
              title={isSaving ? t("account.saving") : t("account.save_changes")}
              onPress={handleSaveChange}
              loading={isSaving}
              disabled={isSaving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Android Native DateTimePicker Dialog */}
      {isDatePickerOpen && Platform.OS === "android" && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* iOS DateTimePicker Modal */}
      {isDatePickerOpen && Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="fade"
          visible={isDatePickerOpen}
          onRequestClose={() => setIsDatePickerOpen(false)}
        >
          <View className="flex-1 bg-black/40 justify-end">
            <View className="bg-white rounded-t-3xl p-5 pb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-neutral-900">
                  {t("account.select_dob")}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsDatePickerOpen(false)}
                >
                  <Text className="text-base font-bold text-orange-600">
                    {t("common.done")}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
