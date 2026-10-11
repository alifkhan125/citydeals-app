import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import DealCard, { DealItem } from "../../components/DealCard";
import DealCardSkeleton from "../../components/DealCardSkeleton";
import { useCoupons, useSavedCoupons, useToggleSaveCoupon } from "../../features/coupons/hooks/useCoupons";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { useUserLocation } from "../../features/location/hooks/useUserLocation";
import { useTranslation } from "react-i18next";

interface ProcessedNearbyDeal extends DealItem {
  distanceKm: number | null;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distanceKm: number | null): string | undefined {
  if (distanceKm === null || isNaN(distanceKm)) return undefined;
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  if (distanceKm < 100) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  return `${Math.round(distanceKm)} km away`;
}

export default function NearbyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isLoggedIn = useAuthStore((state) => state.isAuthenticated);

  const {
    coords,
    locationName,
    isLoading: isLocationLoading,
    refreshLocation,
  } = useUserLocation(false);

  const {
    data: serverCoupons = [],
    isLoading: isCouponsLoading,
    refetch: refetchCoupons,
  } = useCoupons();

  const {
    data: savedCoupons = [],
    refetch: refetchSaved,
  } = useSavedCoupons();

  const toggleSaveMutation = useToggleSaveCoupon();

  const [selectedRadius, setSelectedRadius] = useState("All Nearby");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const radiusFilters = ["1 km", "2 km", "5 km", "All Nearby"];

  const savedSet = useMemo(() => {
    if (!isLoggedIn || !savedCoupons) return new Set<string>();
    return new Set(savedCoupons.map((c) => c.id));
  }, [isLoggedIn, savedCoupons]);

  const processedDeals = useMemo<ProcessedNearbyDeal[]>(() => {
    if (!serverCoupons || serverCoupons.length === 0) return [];

    const userLat = coords?.latitude;
    const userLon = coords?.longitude;

    return serverCoupons.map((coupon) => {
      const rawLat = coupon.area?.latitude ?? coupon.merchant?.latitude;
      const rawLon = coupon.area?.longitude ?? coupon.merchant?.longitude;

      const mLat = rawLat != null ? parseFloat(String(rawLat)) : NaN;
      const mLon = rawLon != null ? parseFloat(String(rawLon)) : NaN;

      let distanceKm: number | null = null;
      if (
        userLat != null &&
        userLon != null &&
        !isNaN(mLat) &&
        !isNaN(mLon)
      ) {
        distanceKm = getDistanceKm(userLat, userLon, mLat, mLon);
      }

      return {
        id: coupon.id,
        category: coupon.category?.name || "General",
        dealHeading: coupon.title,
        dealDescription: coupon.description,
        image: coupon.imageUrl || require("../../../assets/images/placeholder-deal.jpg"),
        isFavorite: isLoggedIn ? savedSet.has(coupon.id) : false,
        merchantName: coupon.merchant?.name || undefined,
        distance: formatDistance(distanceKm),
        distanceKm,
      };
    });
  }, [serverCoupons, coords, savedSet]);

  useEffect(() => {
    if (!serverCoupons || serverCoupons.length === 0) return;

    const userLat = coords?.latitude;
    const userLon = coords?.longitude;
    const nearestDeals = [...serverCoupons]
      .map((coupon) => {
        const rawLat = coupon.merchant?.latitude ?? coupon.area?.latitude;
        const rawLon = coupon.merchant?.longitude ?? coupon.area?.longitude;
        const merchantLat = rawLat != null ? parseFloat(String(rawLat)) : NaN;
        const merchantLon = rawLon != null ? parseFloat(String(rawLon)) : NaN;
        const distanceKm =
          userLat != null &&
          userLon != null &&
          Number.isFinite(merchantLat) &&
          Number.isFinite(merchantLon)
            ? getDistanceKm(userLat, userLon, merchantLat, merchantLon)
            : Number.POSITIVE_INFINITY;

        return { coupon, distanceKm };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 50)
      .map((item) => item.coupon);

    AsyncStorage.setItem("nearby_deals_cache", JSON.stringify(nearestDeals)).catch((error) => {
      console.warn("Failed to cache nearest deals:", error);
    });
  }, [serverCoupons, coords]);

  const radiusCounts = useMemo<Record<string, number>>(() => {
    const dealsWithDistance = processedDeals.filter(
      (d) => d.distanceKm !== null && Number.isFinite(d.distanceKm)
    );

    if (!coords) {
      return {
        "1 km": 0,
        "2 km": 0,
        "5 km": 0,
        "All Nearby": processedDeals.length,
      };
    }
    return {
      // Strict "within": < threshold, NOT <=
      // e.g. 1.9 km → counts for "2 km" ✅, NOT for "1 km" ✅
      // e.g. 3.5 km → does NOT count for "2 km" ✅
      "1 km": dealsWithDistance.filter((d) => d.distanceKm !== null && d.distanceKm < 1).length,
      "2 km": dealsWithDistance.filter((d) => d.distanceKm !== null && d.distanceKm < 2).length,
      "5 km": dealsWithDistance.filter((d) => d.distanceKm !== null && d.distanceKm < 5).length,
      "All Nearby": processedDeals.length,
    };
  }, [processedDeals, coords]);

  // Threshold map — same values used in both count & filter
  const RADIUS_KM: Record<string, number> = { "1 km": 1, "2 km": 2, "5 km": 5 };

  const filteredDeals = useMemo(() => {
    if (processedDeals.length === 0) return [];

    const maxKm = RADIUS_KM[selectedRadius] ?? Infinity;

    let list = processedDeals;

    if (coords && maxKm !== Infinity) {
      // Strict < so count badge and list always match
      list = list.filter((d) => d.distanceKm !== null && d.distanceKm < maxKm);
    }

    return [...list].sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [processedDeals, selectedRadius, coords]);

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

  const handleToggleFavorite = (deal: DealItem, currentFavorite?: boolean) => {
    if (!isLoggedIn) {
      toast.info("Sign In Required", {
        description: "Please sign in to save your favorite deals.",
      });
      router.push("/(auth)/login" as any);
      return;
    }
    const isCurrentlySaved =
      currentFavorite !== undefined ? currentFavorite : !!deal.isFavorite;
    toggleSaveMutation.mutate({
      couponId: deal.id,
      isCurrentlySaved,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchCoupons(),
        isLoggedIn ? refetchSaved() : Promise.resolve(),
        refreshLocation(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshLocation = async () => {
    toast.info("Updating Location", {
      description: "Detecting your current coordinates...",
    });
    await refreshLocation();
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
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t("nearby.title", "Nearby Deals")}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {isCouponsLoading
                ? "Locating offers near you..."
                : `${filteredDeals.length} ${filteredDeals.length === 1 ? "offer" : "offers"
                } ${selectedRadius === "All Nearby"
                  ? "near you"
                  : `within ${selectedRadius}`
                }`}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRefreshLocation}
            style={styles.locationBadge}
          >
            <Ionicons name="location-sharp" size={14} color="#ea580c" />
            <Text style={styles.locationBadgeText} numberOfLines={1} ellipsizeMode="tail">
              {locationName || t("nearby.nearby", "Nearby")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Radius Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.radiusRow}
        >
          {radiusFilters.map((radius) => {
            const isSelected = selectedRadius === radius;
            const count = radiusCounts[radius];
            return (
              <TouchableOpacity
                key={radius}
                activeOpacity={0.8}
                onPress={() => setSelectedRadius(radius)}
                style={[
                  styles.radiusChip,
                  isSelected ? styles.radiusChipActive : styles.radiusChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.radiusText,
                    isSelected ? styles.radiusTextActive : styles.radiusTextInactive,
                  ]}
                >{`< `}
                  {radius === "All Nearby" ? t("nearby.all_nearby", "All Nearby") : radius}
                  {coords && count !== undefined ? ` (${count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#ea580c"
            colors={["#ea580c"]}
          />
        }
      >
        <View style={styles.feedContainer}>
          {/* Location Disabled Banner */}
          {!coords && !isLocationLoading && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRefreshLocation}
              style={styles.locationBanner}
            >
              <View style={styles.locationBannerIcon}>
                <Ionicons name="location-outline" size={18} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationBannerTitle}>
                  {t("nearby.enable_location_title", "Enable Location for Walking Distance")}
                </Text>
                <Text style={styles.locationBannerSubtitle}>
                  {t("nearby.enable_location_subtitle", "Tap here to detect your coordinates and calculate exact distances.")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}

          {/* Loading Skeletons */}
          {isCouponsLoading && !isRefreshing ? (
            <DealCardSkeleton count={3} />
          ) : processedDeals.length > 0 && filteredDeals.length === 0 ? (
            /* Empty state for selected radius */
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="location-outline" size={44} color="#ea580c" />
              </View>
              <Text style={styles.emptyTitle}>
                {t("nearby.no_deals_within", { radius: selectedRadius })}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t("nearby.expand_radius", { count: processedDeals.length })}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedRadius("All Nearby")}
                style={styles.emptyActionButton}
              >
                <Text style={styles.emptyActionButtonText}>
                  {t("nearby.show_all_nearby", { count: processedDeals.length })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : processedDeals.length === 0 ? (
            /* Total empty state */
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="pricetags-outline" size={44} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>
                {t("nearby.no_nearby_deals", "No nearby deals available")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t("nearby.check_back_soon", "Check back soon for new offers from local merchants in this area.")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleRefresh}
                style={styles.emptyActionButton}
              >
                <Text style={styles.emptyActionButtonText}>
                  {t("nearby.refresh_offers", "Refresh Offers")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Render deals list */
            filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onPressOpen={handleOpenDeal}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          )}
        </View>
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
    paddingBottom: 18,
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
    width: "100%",
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    maxWidth: "48%",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  locationBadgeText: {
    color: "#ea580c",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingRight: 16,
    zIndex: 10,
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  radiusChipActive: {
    backgroundColor: "#ea580c",
  },
  radiusChipInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  radiusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  radiusTextActive: {
    color: "#ffffff",
  },
  radiusTextInactive: {
    color: "#e2e8f0",
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 110,
  },
  feedContainer: {
    paddingHorizontal: 16,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  locationBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
  },
  locationBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9a3412",
  },
  locationBannerSubtitle: {
    fontSize: 11,
    color: "#c2410c",
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyActionButton: {
    backgroundColor: "#ea580c",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  emptyActionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
