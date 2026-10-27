import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState, useMemo } from "react";
import {
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import CurvedHeader from "../../components/CurvedHeader";
import LanguageBottomSheet, { LANGUAGES } from "../../components/LanguageBottomSheet";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { useAuthMutations } from "../../features/auth/hooks/useAuthMutations";
import { useCurrentUser } from "../../features/auth/hooks/useCurrentUser";
import { useSavedCoupons, useRedeemedCoupons } from "../../features/coupons/hooks/useCoupons";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoggedIn, storedUser } = useAuthStore(
    useShallow((state) => ({
      isLoggedIn: state.isAuthenticated,
      storedUser: state.user,
    }))
  );

  const { data: currentUser, refetch: refetchUser } = useCurrentUser();
  const user = currentUser || storedUser;

  const {
    data: savedCoupons = [],
    refetch: refetchSaved,
  } = useSavedCoupons();

  const {
    data: redeemedCoupons = [],
    refetch: refetchRedeemed,
  } = useRedeemedCoupons();

  const { logoutMutation } = useAuthMutations();
  const { t, i18n } = useTranslation();

  const currentLangLabel = useMemo(() => {
    const found = LANGUAGES.find((l) => l.id === (i18n.language?.slice(0, 2) || "en"));
    return found?.label || "English";
  }, [i18n.language]);

  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);
  const [isRedeemedModalOpen, setIsRedeemedModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        setTimeout(() => {
          router.replace("/(auth)/login" as any);
        }, 50);
      },
    });
  };

  const handleGoToAuth = () => {
    router.push("/(auth)/login" as any);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      isLoggedIn ? refetchUser() : Promise.resolve(),
      isLoggedIn ? refetchSaved() : Promise.resolve(),
      isLoggedIn ? refetchRedeemed() : Promise.resolve(),
    ]);
    setIsRefreshing(false);
  };

  const savedCount = isLoggedIn
    ? (savedCoupons?.length ?? user?.stats?.savedCoupons ?? 0)
    : 0;

  const redeemedCount = isLoggedIn
    ? (redeemedCoupons?.length ?? user?.stats?.couponRedeemed ?? 0)
    : 0;

  const formattedSavedCount = String(savedCount).padStart(2, "0");
  const formattedRedeemedCount = String(redeemedCount).padStart(2, "0");

  const avatarUri =
    isLoggedIn && user?.profilePictureUrl
      ? user.profilePictureUrl
      : isLoggedIn && user?.fullName
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=ea580c&color=ffffff&bold=true`
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";

  const displayName = isLoggedIn
    ? user?.fullName || t("profile.valued_member")
    : t("profile.guest_user");

  const displaySubtitle = isLoggedIn
    ? user?.email || "Account Active"
    : t("profile.browsing_as_guest");

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />

      {/* Reusable Curved Header */}
      <CurvedHeader title={t("profile.title")} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#ea580c"
            colors={["#ea580c"]}
          />
        }
      >
        {/* User Card */}
        <View
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 3,
          }}
          className="bg-white rounded-3xl p-5 mx-4 mt-4 border border-slate-200"
        >
          {/* User Info Row */}
          <View className="flex-row items-center mb-5">
            <Image
              source={{ uri: avatarUri }}
              className="w-14 h-14 rounded-full bg-neutral-200 border-2 border-orange-100"
              contentFit="cover"
            />
            <View className="ml-3.5 flex-1">
              <Text className="text-neutral-500 text-sm font-normal">
                {isLoggedIn ? t("profile.welcome_back") : t("profile.browsing_as")}
              </Text>
              <Text className="text-neutral-900 font-bold text-lg mt-0.5" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="text-neutral-400 text-xs mt-0.5" numberOfLines={1}>
                {displaySubtitle}
              </Text>
            </View>

            {!isLoggedIn && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleGoToAuth}
                className="bg-orange-50 border border-orange-200 px-3.5 py-2 rounded-2xl"
              >
                <Text className="text-orange-600 font-bold text-sm">
                  {t("profile.sign_in")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Row */}
          <View className="flex-row items-center justify-between">
            {/* Stat 1: Save coupons */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!isLoggedIn) {
                  router.push("/(auth)/login" as any);
                } else {
                  router.push("/(tabs)/saved" as any);
                }
              }}
              className="flex-1 bg-neutral-50 border border-neutral-100 rounded-2xl p-4 mr-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-2xl font-black text-[#0f3455]">
                  {formattedSavedCount}
                </Text>
                <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center">
                  <MaterialCommunityIcons
                    name="ticket-percent-outline"
                    size={22}
                    color="#ea580c"
                  />
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-neutral-600 text-sm font-semibold">
                  {t("profile.saved_coupons")}
                </Text>
                <Feather name="chevron-right" size={14} color="#9ca3af" />
              </View>
            </TouchableOpacity>

            {/* Stat 2: Coupon redeemed */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!isLoggedIn) {
                  router.push("/(auth)/login" as any);
                } else {
                  setIsRedeemedModalOpen(true);
                }
              }}
              className="flex-1 bg-neutral-50 border border-neutral-100 rounded-2xl p-4 ml-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-2xl font-black text-[#0f3455]">
                  {formattedRedeemedCount}
                </Text>
                <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color="#ea580c"
                  />
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-neutral-600 text-sm font-semibold">
                  {t("profile.coupon_redeemed")}
                </Text>
                <Feather name="chevron-right" size={14} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* General Section */}
        <Text className="text-neutral-900 font-bold text-lg px-5 mt-6 mb-3">
          {t("profile.general")}
        </Text>

        {/* Menu Items */}
        <View className="px-4 gap-y-3">
          {/* Account Info */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!isLoggedIn) {
                router.push("/(auth)/login" as any);
              } else {
                router.push("/screens/account" as any);
              }
            }}
            className="bg-white border border-neutral-100 rounded-2xl px-4 h-[60px] flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Feather name="user" size={20} color="#ea580c" />
              <Text className="text-neutral-800 font-semibold text-base ml-3.5">
                {t("profile.account_info")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Change password */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!isLoggedIn) {
                router.push("/(auth)/login" as any);
              } else {
                router.push("/screens/change-password" as any);
              }
            }}
            className="bg-white border border-neutral-100 rounded-2xl px-4 h-[60px] flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Feather name="lock" size={20} color="#ea580c" />
              <Text className="text-neutral-800 font-semibold text-base ml-3.5">
                {t("profile.change_password")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Notification settings */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!isLoggedIn) {
                router.push("/(auth)/login" as any);
              } else {
                router.push("/screens/notification-settings" as any);
              }
            }}
            className="bg-white border border-neutral-100 rounded-2xl px-4 h-[68px] flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Feather name="bell" size={20} color="#ea580c" />
              <View className="ml-3.5 flex-1">
                <Text className="text-neutral-800 font-semibold text-base">
                  Notification settings
                </Text>
                <Text className="text-neutral-400 text-xs mt-0.5">
                  {user?.notificationsPaused ? "Paused" : `${user?.notificationRadiusMeters ?? 2000}m radius`}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Language */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsLanguageSheetOpen(true)}
            className="bg-white border border-neutral-100 rounded-2xl px-4 h-[60px] flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <MaterialCommunityIcons
                name="translate"
                size={20}
                color="#ea580c"
              />
              <Text className="text-neutral-800 font-semibold text-base ml-3.5">
                {t("profile.language")}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-neutral-500 text-sm font-medium mr-2">
                {currentLangLabel}
              </Text>
              <Feather name="chevron-right" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/screens/help-support" as any)}
            className="bg-white border border-neutral-100 rounded-2xl px-4 h-[60px] flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Feather name="shield" size={20} color="#ea580c" />
              <Text className="text-neutral-800 font-semibold text-base ml-3.5">
                {t("profile.help_support")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Terms of Use */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/screens/terms-of-use" as any)}
            className="bg-white border border-neutral-100 rounded-2xl px-4 h-[60px] flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Feather name="file-text" size={20} color="#ea580c" />
              <Text className="text-neutral-800 font-semibold text-base ml-3.5">
                {t("profile.terms_of_use")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Log Out or Sign In CTA Button */}
        {isLoggedIn ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogout}
            className="bg-red-50 border border-red-100 rounded-2xl py-4 flex-row items-center justify-center mx-4 mt-5"
          >
            <Feather name="log-out" size={20} color="#ef4444" />
            <Text className="text-red-500 font-bold text-base ml-2">
              {t("profile.log_out")}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGoToAuth}
            className="bg-orange-500 rounded-2xl py-4 flex-row items-center justify-center mx-4 mt-5"
          >
            <Feather name="log-in" size={20} color="#ffffff" />
            <Text className="text-white font-bold text-base ml-2">
              {t("profile.sign_in_register")}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Redeemed Coupons Modal */}
      <Modal
        visible={isRedeemedModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsRedeemedModalOpen(false)}
      >
        <View className="flex-1 bg-neutral-50">
          <StatusBar style="dark" />

          {/* Modal Header */}
          <View className="bg-white px-5 pt-5 pb-4 border-b border-neutral-100 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-extrabold text-neutral-900">
                {t("profile.redeemed_coupons_title")}
              </Text>
              <Text className="text-neutral-500 text-xs mt-0.5">
                {redeemedCoupons.length} {redeemedCoupons.length === 1 ? "offer" : "offers"} redeemed in total
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsRedeemedModalOpen(false)}
              className="w-9 h-9 rounded-full bg-neutral-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          >
            {redeemedCoupons.length === 0 ? (
              <View className="items-center justify-center py-16 px-6 bg-white rounded-3xl mt-4 border border-neutral-100">
                <View className="w-20 h-20 rounded-full bg-orange-50 items-center justify-center mb-4">
                  <Ionicons name="ticket-outline" size={40} color="#ea580c" />
                </View>
                <Text className="text-lg font-bold text-neutral-900 text-center">
                  {t("profile.no_redeemed_coupons")}
                </Text>
                <Text className="text-neutral-500 text-sm text-center mt-1.5 leading-5">
                  When you claim and redeem coupons at local merchants, they will appear here in your redemption history.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsRedeemedModalOpen(false);
                    router.push("/(tabs)/nearby" as any);
                  }}
                  className="bg-orange-500 px-5 py-2.5 rounded-full mt-6"
                >
                  <Text className="text-white font-bold text-sm">
                    Find Deals Nearby
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              redeemedCoupons.map((coupon) => (
                <TouchableOpacity
                  key={coupon.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIsRedeemedModalOpen(false);
                    router.push({
                      pathname: "/screens/coupon-details" as any,
                      params: {
                        id: coupon.id,
                        dealHeading: coupon.title,
                        dealDescription: coupon.description,
                        category: coupon.category?.name ?? "",
                        imageUrl: typeof coupon.imageUrl === "string" ? encodeURIComponent(coupon.imageUrl) : "",
                      },
                    });
                  }}
                  className="bg-white rounded-2xl p-3.5 mb-3 border border-neutral-100 flex-row items-center shadow-xs"
                >
                  <Image
                    source={
                      coupon.imageUrl
                        ? { uri: coupon.imageUrl }
                        : require("../../../assets/images/placeholder-deal.jpg")
                    }
                    className="w-16 h-16 rounded-xl bg-neutral-100"
                    contentFit="cover"
                  />
                  <View className="ml-3 flex-1 pr-2">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <View className="bg-emerald-50 px-2 py-0.5 rounded-md flex-row items-center border border-emerald-200">
                        <Ionicons name="checkmark-circle" size={10} color="#059669" />
                        <Text className="text-[10px] font-bold text-emerald-700 ml-1">
                          REDEEMED
                        </Text>
                      </View>
                      {coupon.merchant?.name && (
                        <Text className="text-neutral-400 text-xs font-medium" numberOfLines={1}>
                          • {coupon.merchant.name}
                        </Text>
                      )}
                    </View>
                    <Text className="text-neutral-900 font-bold text-sm" numberOfLines={1}>
                      {coupon.title}
                    </Text>
                    <Text className="text-neutral-500 text-xs mt-0.5" numberOfLines={1}>
                      Code: <Text className="font-mono font-bold text-neutral-700">{coupon.couponCode}</Text>
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modular Reusable LanguageBottomSheet */}
      <LanguageBottomSheet
        isPresented={isLanguageSheetOpen}
        onDismiss={() => setIsLanguageSheetOpen(false)}
        selectedLanguage={i18n.language || "en"}
      />
    </View>
  );
}
