import { Feather, FontAwesome, FontAwesome6, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { toast } from "sonner-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { couponsApi } from "../../features/coupons/services/couponsApi";
import { COUPONS_QUERY_KEY, SAVED_COUPONS_QUERY_KEY, REDEEMED_COUPONS_QUERY_KEY } from "../../features/coupons/hooks/useCoupons";
import { Coupon } from "../../features/coupons/types";
import {
  shareCouponWithSystemSheet,
  shareToSocialPlatform,
  trackCouponShare,
} from "../../utils/shareUtils";
import { useTranslation } from "react-i18next";
import { settingsApi } from "../../features/settings/services/settingsApi";

const fallbackPlaceholder = require("../../../assets/images/placeholder-deal.jpg");

export default function CouponDetailsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isLoggedIn = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const isBlockedUser = currentUser?.status === "BANNED" || currentUser?.status === "SUSPENDED";
  const blockedMessage = currentUser?.status === "BANNED" ? "This user is banned" : "This user is suspended";

  const params = useLocalSearchParams<{
    id: string;
    shareSlug?: string;
    dealHeading?: string;
    dealDescription?: string;
    category?: string;
    imageUrl?: string;
  }>();

  const dealId = params.id || "";
  const sharedSlug = params.shareSlug || "";

  // Live Coupon State
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const activeCouponId = coupon?.id || dealId;
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [redemptionAvailableAt, setRedemptionAvailableAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isCouponCodeModalVisible, setIsCouponCodeModalVisible] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [shareBaseUrl, setShareBaseUrl] = useState<string | null>(null);

  // Modals
  const [isAuthPromptVisible, setIsAuthPromptVisible] = useState(false);

  // Load live coupon details from backend
  useEffect(() => {
    let isMounted = true;

    async function loadCouponDetails() {
      if (!dealId && !sharedSlug) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const resolvedCoupon = sharedSlug
          ? await couponsApi.getCouponBySlug(sharedSlug)
          : await couponsApi.getCouponById(dealId);
        const data = sharedSlug && isLoggedIn && resolvedCoupon?.id
          ? await couponsApi.getCouponById(resolvedCoupon.id)
          : resolvedCoupon;
        if (isMounted && data) {
          setCoupon(data);
          setIsSaved(!!data.isSaved);
          setIsRedeemed(!!data.isRedeemed);
          setRedemptionAvailableAt(data.redemptionAvailableAt || null);
          setNow(Date.now());
        }
      } catch (err) {
        console.warn("Could not fetch coupon details by ID, falling back to params:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCouponDetails();

    return () => {
      isMounted = false;
    };
  }, [dealId, sharedSlug, isLoggedIn]);

  useEffect(() => {
    settingsApi.getAppRedirectSettings()
      .then((settings) => setShareBaseUrl(settings.baseUrl?.replace(/\/$/, "") || null))
      .catch(() => setShareBaseUrl(null));
  }, []);

  useEffect(() => {
    if (!redemptionAvailableAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [redemptionAvailableAt]);

  const availableAt = redemptionAvailableAt ? Date.parse(redemptionAvailableAt) : NaN;
  const redemptionSecondsLeft = Number.isFinite(availableAt)
    ? Math.max(0, Math.ceil((availableAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (!activeCouponId) return;
    couponsApi.trackCouponView(activeCouponId).catch((err) => {
      console.warn("Could not track coupon view:", err);
    });
  }, [activeCouponId]);

  // Derived Display Values
  const dealHeading = coupon?.title || params.dealHeading || "Exclusive Coupon Deal";
  const dealDescription = coupon?.description || params.dealDescription || "Show this coupon to get instant savings at checkout.";
  const merchantName = coupon?.merchant?.name || "Partner Merchant";
  const merchantAddress = coupon?.merchant?.address || (coupon?.area ? `${coupon.area.name}, ${coupon.area.city || ""}` : "Store location in-app");
  const configuredBaseUrl = shareBaseUrl || process.env.EXPO_PUBLIC_BASE_URL?.replace(/\/api\/?$/, "").replace(/\/$/, "") || "";
  const dealUrl = configuredBaseUrl
    ? `${configuredBaseUrl}/c/${coupon?.shareSlug || sharedSlug || dealId}/open`
    : "";

  // Image Source Resolution with bulletproof fallback
  const couponImageUrl = coupon?.imageUrl;
  const resolvedImageUrl = useMemo(() => {
    if (couponImageUrl && couponImageUrl.trim() !== "") {
      return couponImageUrl.trim();
    }
    if (params.imageUrl && params.imageUrl.trim() !== "") {
      try {
        const decoded = decodeURIComponent(params.imageUrl.trim());
        return decoded;
      } catch {
        return params.imageUrl.trim();
      }
    }
    return null;
  }, [couponImageUrl, params.imageUrl]);

  const imageSource = useMemo(() => {
    if (failedImageUrl === resolvedImageUrl || !resolvedImageUrl || typeof resolvedImageUrl !== "string" || resolvedImageUrl.trim() === "") {
      return fallbackPlaceholder;
    }
    return { uri: resolvedImageUrl.trim() };
  }, [failedImageUrl, resolvedImageUrl]);

  const showToast = (msg: string) => {
    toast.success(msg);
  };

  const isRedemptionCooldownActive = isRedeemed && redemptionSecondsLeft > 0;
  const canRedeemAgain = isRedeemed && (
    coupon?.redemptionFrequency === "UNLIMITED" ||
    (Number.isFinite(availableAt) && redemptionSecondsLeft === 0)
  );
  const isPermanentlyRedeemed = isRedeemed && !redemptionAvailableAt && !canRedeemAgain;
  const formatCountdown = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  // Redeem button handler
  const handleRedeemPress = () => {
    if (isBlockedUser) {
      toast.error(blockedMessage);
      return;
    }
    if (!isLoggedIn) {
      setIsAuthPromptVisible(true);
      return;
    }

    // Repeat redemption follows this coupon's frequency and backend cooldown.
    if (isRedeemed && !canRedeemAgain) {
      toast.error(
        isRedemptionCooldownActive
          ? `This coupon is locked for ${formatCountdown(redemptionSecondsLeft)}.`
          : "This coupon has already been redeemed.",
      );
      return;
    }

    setCouponCodeInput("");
    setIsCouponCodeModalVisible(true);
  };

  const executeRedeemCoupon = async (couponCode: string) => {
    try {
      setIsRedeeming(true);
      const result = await couponsApi.redeemCoupon(activeCouponId, couponCode);
      setIsCouponCodeModalVisible(false);
      setCouponCodeInput("");
      setIsRedeemed(true);
      setRedemptionAvailableAt(result?.redemptionAvailableAt || null);
      setNow(Date.now());
      queryClient.invalidateQueries({ queryKey: REDEEMED_COUPONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      showToast("Coupon redeemed successfully!");
      await handleShareDeal();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to redeem coupon";
      const errorText = Array.isArray(msg) ? msg[0] : msg;

      if (err.response?.status === 409) {
        try {
          const latest = await couponsApi.getCouponById(activeCouponId);
          setCoupon(latest);
          setIsRedeemed(!!latest.isRedeemed);
          setRedemptionAvailableAt(latest.redemptionAvailableAt || null);
          setNow(Date.now());
        } catch {
          // Keep the original conflict message if refreshing fails.
        }
      }

      if (errorText.toLowerCase().includes("already redeemed")) {
        setIsRedeemed(true);
        queryClient.invalidateQueries({ queryKey: REDEEMED_COUPONS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        showToast("You have already redeemed this coupon.");
      } else {
        toast.error(errorText);
      }
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCouponCodeSubmit = () => {
    const code = couponCodeInput.trim();
    if (!code) {
      toast.error("Enter the coupon code provided by the business.");
      return;
    }
    void executeRedeemCoupon(code);
  };

  // Save / Favorite Toggle Handler
  const handleToggleSave = async () => {
    if (!isLoggedIn) {
      setIsAuthPromptVisible(true);
      return;
    }

    try {
      setIsSaving(true);
      if (isSaved) {
        await couponsApi.unsaveCoupon(activeCouponId);
        setIsSaved(false);
        queryClient.setQueryData<Coupon[]>(SAVED_COUPONS_QUERY_KEY, (old = []) =>
          old.filter((c) => c.id !== activeCouponId)
        );
        showToast("Coupon removed from saved.");
      } else {
        await couponsApi.saveCoupon(activeCouponId);
        setIsSaved(true);
        if (coupon) {
          queryClient.setQueryData<Coupon[]>(SAVED_COUPONS_QUERY_KEY, (old = []) => [
            { ...coupon, isSaved: true },
            ...old.filter((c) => c.id !== activeCouponId),
          ]);
        }
        showToast("Coupon saved successfully!");
      }
      queryClient.invalidateQueries({ queryKey: SAVED_COUPONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: COUPONS_QUERY_KEY });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to update saved deal";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSaving(false);
    }
  };

function ensureHttps(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

  // Open store / deal website
  const handleOpenWebsite = () => {
    const raw = coupon?.merchant?.websiteUrl || coupon?.couponLink || dealUrl;
    const targetUrl = ensureHttps(raw);
    if (!targetUrl) {
      toast.error("No website link available for this deal.");
      return;
    }
    Linking.openURL(targetUrl).catch(() => {
      toast.error("Unable to open website link.");
    });
  };

  // Open directions / Map
  const handleOpenMap = () => {
    const lat = coupon?.area?.latitude || coupon?.merchant?.latitude;
    const lng = coupon?.area?.longitude || coupon?.merchant?.longitude;

    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(merchantName)})`,
      }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(url).catch(() => {});
    } else if (merchantAddress) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchantAddress)}`).catch(() => {});
    }
  };

  // General share handler
  const handleShareDeal = async () => {
    await shareCouponWithSystemSheet(
      {
        dealHeading,
        dealDescription,
        dealUrl,
        imageSource,
        shareSlug: coupon?.shareSlug,
      },
      showToast
    );
  };

  // Share via Email
  const handleShareEmail = () => {
    trackCouponShare({ dealHeading, dealDescription, dealUrl, imageSource, shareSlug: coupon?.shareSlug }, "email");
    const subject = encodeURIComponent(`Exclusive Deal: ${dealHeading}`);
    const body = encodeURIComponent(
      `Check out this offer on CityDeals!\n\n${dealHeading}\n${dealDescription}\n\nGet the coupon: ${dealUrl}`
    );
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => {
      toast.error("No email app configured on this device.");
    });
  };

  // Share to Social platforms
  const handleShareFacebook = async () => {
    const fbProfile = ensureHttps(coupon?.merchant?.facebookUrl);
    if (fbProfile) {
      Linking.openURL(fbProfile).catch(() => {
        shareToSocialPlatform("facebook", { dealHeading, dealDescription, dealUrl, imageSource, shareSlug: coupon?.shareSlug }, showToast);
      });
      return;
    }
    await shareToSocialPlatform("facebook", { dealHeading, dealDescription, dealUrl, imageSource, shareSlug: coupon?.shareSlug }, showToast);
  };

  const handleShareInstagram = async () => {
    const igProfile = ensureHttps(coupon?.merchant?.instagramUrl);
    if (igProfile) {
      Linking.openURL(igProfile).catch(() => {
        shareToSocialPlatform("instagram", { dealHeading, dealDescription, dealUrl, imageSource, shareSlug: coupon?.shareSlug }, showToast);
      });
      return;
    }
    await shareToSocialPlatform("instagram", { dealHeading, dealDescription, dealUrl, imageSource, shareSlug: coupon?.shareSlug }, showToast);
  };

  const handleShareTikTok = async () => {
    const ttProfile = ensureHttps(coupon?.merchant?.tiktokUrl);
    if (ttProfile) {
      Linking.openURL(ttProfile).catch(() => {
        shareToSocialPlatform("tiktok", { dealHeading, dealDescription, dealUrl, imageSource, shareSlug: coupon?.shareSlug }, showToast);
      });
      return;
    }
    await shareToSocialPlatform("tiktok", { dealHeading, dealDescription, dealUrl, imageSource, shareSlug: coupon?.shareSlug }, showToast);
  };

  const handleShareSMS = async () => {
    await shareToSocialPlatform("sms", { dealHeading, dealDescription, dealUrl, imageSource, shareSlug: coupon?.shareSlug }, showToast);
  };

  const headerHeight = insets.top + 12 + 44 + 16;

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Floating Header */}
      <View
        className="absolute top-0 left-0 right-0 z-10 bg-[#0f3b5e] rounded-b-[28px] flex-row items-center justify-between px-4 pb-4 shadow-md"
        style={{ paddingTop: insets.top + 12, height: headerHeight }}
        pointerEvents="box-none"
      >
        <View className="absolute inset-0 rounded-b-[28px] overflow-hidden">
          <Image
            source={require("../../../assets/images/line-background.png")}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)" as any);
            }
          }}
          className="w-11 h-11 rounded-2xl bg-white items-center justify-center z-10 border border-neutral-100 shadow-sm"
        >
          <Feather name="arrow-left" size={20} color="#1e293b" />
        </TouchableOpacity>

        <Text className="text-white text-lg font-bold z-10">
          {t("coupon_details.title", "Coupon Details")}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleShareDeal}
          className="w-11 h-11 rounded-2xl bg-white items-center justify-center z-10 border border-neutral-100 shadow-sm"
        >
          <Ionicons name="share-social-outline" size={20} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <View style={{ maxWidth: 640, width: "100%", alignSelf: "center" }}>
        {/* Loading Indicator */}
        {loading && (
          <View className="mx-4 mt-3 py-2 flex-row items-center justify-center gap-2 bg-orange-50/80 rounded-xl">
            <ActivityIndicator size="small" color="#ea580c" />
            <Text className="text-xs font-medium text-orange-700">Refreshing live coupon details...</Text>
          </View>
        )}

        {/* Guest Banner */}
        {!isLoggedIn && (
          <View className="mx-4 mt-4 bg-orange-50 border border-orange-200 rounded-3xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-11 h-11 rounded-2xl bg-orange-500 items-center justify-center mr-3">
                <Ionicons name="sparkles" size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-neutral-900 font-bold text-base">
                  Sign In to Redeem
                </Text>
                <Text className="text-neutral-600 text-xs mt-0.5">
                  Sign in or create a free account to redeem this coupon in-store.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/login" as any)}
              className="bg-neutral-900 px-3.5 py-2.5 rounded-xl active:bg-neutral-800"
            >
              <Text className="text-white font-bold text-xs">Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Poster card with image */}
        <View className="px-4 pt-4">
          <View className="rounded-3xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-sm">
            <Image
              source={imageSource}
              style={{ width: "100%", height: 380 }}
              contentFit="cover"
              transition={200}
              onError={() => setFailedImageUrl(resolvedImageUrl)}
            />
          </View>
        </View>

        {/* Info Section */}
        <View className="px-5 pt-5 bg-white">
          {/* Store logo + deal title row */}
          <View className="flex-row items-center mb-5">
            {coupon?.merchant?.logoUrl ? (
              <View className="w-14 h-14 rounded-2xl overflow-hidden border border-neutral-200 mr-3.5 bg-white shadow-sm">
                <Image
                  source={{ uri: coupon.merchant.logoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
            ) : (
              <View className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-amber-400 items-center justify-center mr-3.5 shadow-sm">
                <Text className="text-2xl font-extrabold text-amber-700">
                  {dealHeading.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-xl font-bold text-neutral-900 leading-tight">
                {dealHeading}
              </Text>
              <Text className="text-sm text-neutral-500 mt-1 leading-5">
                {dealDescription}
              </Text>
            </View>
          </View>

          {/* Primary Action: Redeem Coupon */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleRedeemPress}
            disabled={isRedeeming || isBlockedUser || (isRedeemed && !canRedeemAgain)}
            style={{
              backgroundColor: isBlockedUser ? "#94a3b8" : (isRedemptionCooldownActive || isPermanentlyRedeemed) ? "#059669" : "#ea580c",
            }}
            className="w-full flex-row items-center justify-center gap-2.5 rounded-2xl py-4 mb-3"
          >
            {isRedeeming ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons
                  name={(isRedemptionCooldownActive || isPermanentlyRedeemed) ? "checkmark-circle" : "ticket"}
                  size={22}
                  color="#ffffff"
                />
                <Text
                  style={{ color: "#ffffff" }}
                  className="text-white text-base font-bold tracking-wide"
                >
                  {isBlockedUser
                    ? blockedMessage
                    : isRedemptionCooldownActive
                      ? "Already Redeemed"
                      : canRedeemAgain
                        ? "Redeem Again"
                        : isPermanentlyRedeemed
                          ? "Already Redeemed"
                        : t("coupon_details.redeem_coupon", "Redeem Coupon")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {isRedemptionCooldownActive && (
            <View className="mb-4 flex-row items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Ionicons name="time-outline" size={18} color="#047857" />
              <Text className="ml-2 text-sm font-semibold text-emerald-700">
                You can redeem this coupon again in {formatCountdown(redemptionSecondsLeft)}
              </Text>
            </View>
          )}

          {/* Secondary Action: Save coupon */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleToggleSave}
            disabled={isSaving}
            style={{
              backgroundColor: isSaved ? "#fff7ed" : "#0f172a",
              borderColor: isSaved ? "#fed7aa" : "#1e293b",
            }}
            className="w-full flex-row items-center justify-center gap-2.5 rounded-2xl py-4 mb-6 border"
          >
            {isSaving ? (
              <ActivityIndicator color={isSaved ? "#ea580c" : "#ffffff"} size="small" />
            ) : (
              <>
                <Ionicons
                  name={isSaved ? "heart" : "heart-outline"}
                  size={20}
                  color={isSaved ? "#ea580c" : "#ffffff"}
                />
                <Text
                  style={{ color: isSaved ? "#ea580c" : "#ffffff" }}
                  className="text-base font-bold"
                >
                  {isSaved ? t("coupon_details.coupon_saved", "Coupon Saved") : t("coupon_details.save_coupon", "Save coupon")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="h-px bg-neutral-100 mb-5" />

          {/* Store location row */}
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-1 mr-3">
              <Text className="text-base font-bold text-neutral-900 mb-0.5">
                {merchantName}
              </Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={15} color="#ea580c" />
                <Text className="text-sm text-neutral-500 flex-shrink leading-tight">
                  {merchantAddress}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenMap}
              style={{ backgroundColor: "#0f172a" }}
              className="flex-row items-center gap-1.5 rounded-xl px-3.5 py-2.5 active:bg-neutral-800"
            >
              <Ionicons name="navigate-outline" size={15} color="#ffffff" />
              <Text className="text-white text-xs font-semibold">{t("coupon_details.directions", "Directions")}</Text>
            </TouchableOpacity>
          </View>

          {/* Terms & Rules (if present) */}
          {coupon?.terms && (
            <View className="mb-5 rounded-2xl bg-neutral-50 p-4 border border-neutral-200">
              <Text className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                {t("coupon_details.terms_conditions", "Terms & Conditions")}
              </Text>
              <Text className="text-xs text-neutral-600 leading-5">
                {coupon.terms}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View className="h-px bg-neutral-100 mb-5" />

          {/* Website + Email Row */}
          <View className="flex-row gap-2.5 mb-3">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenWebsite}
              style={{ backgroundColor: "#0f172a" }}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:bg-neutral-800 shadow-sm"
            >
              <Ionicons name="globe-outline" size={18} color="#ffffff" />
              <Text className="text-white text-sm font-semibold">{t("coupon_details.website", "Website")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleShareEmail}
              style={{ backgroundColor: "#0f172a" }}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:bg-neutral-800 shadow-sm"
            >
              <Ionicons name="mail-outline" size={18} color="#ffffff" />
              <Text className="text-white text-sm font-semibold">{t("coupon_details.email", "Email")}</Text>
            </TouchableOpacity>
          </View>

          {/* Social & Sharing Links: Facebook, Instagram, TikTok, Message/SMS */}
          <View className="flex-row gap-2.5">
            {/* Facebook */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleShareFacebook}
              style={{ backgroundColor: "#0f172a" }}
              className="flex-1 items-center justify-center rounded-2xl py-3.5 active:bg-neutral-800 shadow-sm"
            >
              <FontAwesome name="facebook" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Instagram */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleShareInstagram}
              style={{ backgroundColor: "#0f172a" }}
              className="flex-1 items-center justify-center rounded-2xl py-3.5 active:bg-neutral-800 shadow-sm"
            >
              <FontAwesome name="instagram" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* TikTok */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleShareTikTok}
              style={{ backgroundColor: "#0f172a" }}
              className="flex-1 items-center justify-center rounded-2xl py-3.5 active:bg-neutral-800 shadow-sm"
            >
              <FontAwesome6 name="tiktok" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Message / SMS */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleShareSMS}
              style={{ backgroundColor: "#0f172a" }}
              className="flex-1 items-center justify-center rounded-2xl py-3.5 active:bg-neutral-800 shadow-sm"
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </ScrollView>

      {/* Guest Authentication Required Modal */}
      <Modal
        visible={isCouponCodeModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isRedeeming && setIsCouponCodeModalVisible(false)}
      >
        <View style={{ paddingBottom: Math.max(insets.bottom, 24) }} className="flex-1 bg-black/60 items-center justify-center px-5">
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            <Text className="text-xl font-extrabold text-neutral-900">Enter coupon code</Text>
            <Text className="text-neutral-500 text-sm mt-2 leading-5">
              Enter the coupon code provided by the business to redeem this offer.
            </Text>
            <TextInput
              value={couponCodeInput}
              onChangeText={(text) =>
                setCouponCodeInput(text.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 10))
              }
              placeholder="Enter coupon code"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              editable={!isRedeeming}
              className="w-full h-12 border border-neutral-200 rounded-xl px-4 mt-5 text-neutral-900 font-semibold tracking-wider"
            />
            <View className="flex-row gap-3 mt-5">
              <TouchableOpacity
                disabled={isRedeeming}
                onPress={() => setIsCouponCodeModalVisible(false)}
                className="flex-1 rounded-xl bg-neutral-100 py-3.5 items-center"
              >
                <Text className="text-neutral-700 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isRedeeming}
                onPress={handleCouponCodeSubmit}
                className="flex-1 rounded-xl bg-orange-500 py-3.5 items-center"
              >
                {isRedeeming ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Verify</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAuthPromptVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsAuthPromptVisible(false)}
      >
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          className="flex-1 bg-black/60 items-center justify-center px-5"
        >
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center mb-4 border border-orange-200">
              <Ionicons name="lock-closed" size={28} color="#ea580c" />
            </View>

            <Text className="text-xl font-extrabold text-neutral-900 text-center tracking-tight">
              {t("coupon_details.sign_in_continue", "Sign In to Continue")}
            </Text>
            <Text className="text-neutral-500 text-sm text-center mt-2 leading-5">
              {t("coupon_details.guest_prompt", "You are currently browsing as a guest. Please sign in or create an account to redeem and save deals.")}
            </Text>

            <View className="w-full gap-y-2.5 mt-6">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setIsAuthPromptVisible(false);
                  router.push("/(auth)/login" as any);
                }}
                style={{ backgroundColor: "#ea580c" }}
                className="w-full rounded-2xl py-3.5 items-center justify-center shadow-sm"
              >
                <Text style={{ color: "#ffffff" }} className="text-white font-bold text-base">{t("profile.sign_in", "Sign In")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setIsAuthPromptVisible(false);
                  router.push("/(auth)/register" as any);
                }}
                className="w-full bg-neutral-100 rounded-2xl py-3.5 items-center justify-center border border-neutral-200"
              >
                <Text className="text-neutral-800 font-bold text-sm">
                  {t("coupon_details.create_free_account", "Create Free Account")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsAuthPromptVisible(false)}
                className="w-full py-2 items-center justify-center mt-1"
              >
                <Text className="text-neutral-500 font-semibold text-sm">
                  {t("coupon_details.keep_browsing", "Keep Browsing")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
