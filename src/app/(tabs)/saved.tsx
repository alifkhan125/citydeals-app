import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DealCard, { DealItem } from "../../components/DealCard";
import PrimaryButton from "../../components/PrimaryButton";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { useSavedCoupons, useToggleSaveCoupon } from "../../features/coupons/hooks/useCoupons";
import { toast } from "sonner-native";
import { useTranslation } from "react-i18next";

export default function SavedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isLoggedIn = useAuthStore((state) => state.isAuthenticated);

  const {
    data: serverSavedCoupons = [],
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useSavedCoupons();

  const toggleSaveMutation = useToggleSaveCoupon();

  const savedDeals: DealItem[] = useMemo(() => {
    if (!isLoggedIn || !serverSavedCoupons) return [];
    return serverSavedCoupons.map((c) => ({
      id: c.id,
      category: c.category?.name || "General",
      dealHeading: c.title,
      dealDescription: c.description,
      image: c.imageUrl || require("../../../assets/images/placeholder-deal.jpg"),
      isFavorite: true,
    }));
  }, [isLoggedIn, serverSavedCoupons]);

  const handleOpenDeal = (deal: DealItem) => {
    router.push({
      pathname: "/screens/coupon-details" as any,
      params: {
        id: deal.id,
        dealHeading: deal.dealHeading,
        dealDescription: deal.dealDescription,
        category: deal.category ?? "",
        imageUrl: typeof deal.image === "string" ? encodeURIComponent(deal.image) : "",
      },
    });
  };

  const handleToggleFavorite = (toggledDeal: DealItem) => {
    if (!isLoggedIn) {
      toast.info(t("saved.sign_in_required", "Sign In Required"), {
        description: t("saved.manage_saved_signin", "Please sign in to manage your saved deals."),
      });
      return;
    }
    toggleSaveMutation.mutate({ couponId: toggledDeal.id, isCurrentlySaved: true });
  };

  const handleExploreDeals = () => {
    router.push("/(tabs)" as any);
  };

  const handleSignIn = () => {
    router.push("/(auth)/login" as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Deep Navy Top Header with Starry Backdrop */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Image
          source={require("../../../assets/images/line-background.png")}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>{t("saved.title", "Saved Coupons")}</Text>
            <Text style={styles.headerSubtitle}>
              {t("saved.deals_saved", { count: savedDeals.length })}
            </Text>
          </View>

          <View style={styles.badge}>
            <Ionicons name="heart" size={16} color="#ea580c" />
            <Text style={styles.badgeText}>{t("saved.saved_badge", { count: savedDeals.length })}</Text>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#ea580c"
            colors={["#ea580c"]}
          />
        }
      >
        {!isLoggedIn ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require("../../../assets/images/coupons-3.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>{t("saved.sign_in_title", "Sign In to View Saved Deals")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("saved.sign_in_subtitle", "Sign in to your CityDeals account to view and redeem your saved coupons across all devices.")}
            </Text>
            <PrimaryButton
              title={t("saved.sign_in_now", "Sign In Now")}
              onPress={handleSignIn}
              className="mt-6 w-full max-w-xs"
            />
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>{t("saved.loading", "Loading your saved coupons...")}</Text>
          </View>
        ) : isError ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require("../../../assets/images/coupons-3.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>{t("saved.load_failed_title", "Saved coupons could not load")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("saved.load_failed_subtitle", "Please check your connection and try again.")}
            </Text>
            <PrimaryButton
              title={t("common.retry", "Retry")}
              onPress={() => refetch()}
              className="mt-6 w-full max-w-xs"
            />
          </View>
        ) : savedDeals.length > 0 ? (
          <View style={styles.feedContainer}>
            {savedDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onPressOpen={handleOpenDeal}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Image
              source={require("../../../assets/images/coupons-3.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>{t("saved.no_saved_title", "No Saved Deals Yet")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("saved.no_saved_subtitle", "Tap the heart icon on any deal from the Home tab or Coupon Details to save and access them anytime here.")}
            </Text>
            <PrimaryButton
              title={t("saved.explore_deals", "Explore Deals")}
              onPress={handleExploreDeals}
              className="mt-6 w-full max-w-xs"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#0f3b5e",
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    marginTop: 4,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "400",
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeText: {
    color: "#ea580c",
    fontSize: 14,
    fontWeight: "700",
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 110,
  },
  feedContainer: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  emptyContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    maxWidth: 280,
  },
});
