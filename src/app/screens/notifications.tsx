import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import CurvedHeader from "../../components/CurvedHeader";
import { useNotifications, useMarkAsRead } from "../../features/notifications/hooks/useNotifications";
import { Notification } from "../../features/notifications/types";
import { navigateToNotificationSource } from "../../features/notifications/services/pushNotificationService";
import { useAuthStore } from "../../features/auth/store/useAuthStore";
import { useTranslation } from "react-i18next";

/** Human-friendly relative time string */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getNotificationIcon(data?: Record<string, any> | null): {
  name: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
} {
  if (data?.merchantId) {
    return { name: "location", bg: "bg-blue-50", color: "#3b82f6" };
  }
  if (data?.sourceType === "BIRTHDAY_GIFT" || data?.sourceType === "BIRTHDAY") {
    return { name: "gift", bg: "bg-orange-50", color: "#ea580c" };
  }
  if (data?.sendTo === "AREA") {
    return { name: "compass", bg: "bg-purple-50", color: "#8b5cf6" };
  }
  return { name: "megaphone", bg: "bg-orange-50", color: "#ea580c" };
}

function NotificationItem({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
}) {
  const isUnread = !item.readAt;
  const icon = getNotificationIcon(item.data);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      className={`mx-4 mb-2.5 rounded-2xl px-4 py-3.5 flex-row items-start border ${
        isUnread
          ? "bg-orange-50/50 border-orange-100/80"
          : "bg-white border-neutral-100"
      }`}
    >
      {/* Icon */}
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 mt-0.5 ${icon.bg}`}
      >
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text
            className={`text-sm font-bold flex-1 mr-2 ${
              isUnread ? "text-neutral-900" : "text-neutral-700"
            }`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {isUnread && (
            <View className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          )}
        </View>
        <Text
          className={`text-xs leading-4 ${
            isUnread ? "text-neutral-600" : "text-neutral-400"
          }`}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text className="text-[10px] text-neutral-400 mt-1.5 font-medium">
          {timeAgo(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const isLoggedIn = useAuthStore((state) => state.isAuthenticated);
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch, isFetching } = useNotifications(page, 30);
  const markAsReadMutation = useMarkAsRead();

  const notifications = data?.items ?? [];
  const meta = data?.meta;
  const unreadCount = meta?.unreadCount ?? 0;

  const handleRefresh = useCallback(async () => {
    setPage(1);
    await refetch();
  }, [refetch]);

  const handleNotificationPress = (item: Notification) => {
    // Mark as read if unread
    if (!item.readAt) {
      markAsReadMutation.mutate(item.id);
    }

    navigateToNotificationSource(item.data);
  };

  const handleLoadMore = () => {
    if (meta && page < meta.totalPages && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  if (!isLoggedIn) {
    return (
      <View className="flex-1 bg-neutral-50">
        <StatusBar style="light" />
        <CurvedHeader title={t("notifications.title", "Notifications")} showBackButton />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-orange-50 items-center justify-center mb-4">
            <Ionicons name="notifications-off-outline" size={40} color="#ea580c" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center">
            {t("notifications.sign_in_title", "Sign In to View Notifications")}
          </Text>
          <Text className="text-neutral-500 text-sm text-center mt-1.5 leading-5">
            {t("notifications.sign_in_subtitle", "Create an account or sign in to receive deal alerts and notifications.")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(auth)/login" as any)}
            className="bg-orange-500 px-6 py-3 rounded-full mt-6"
          >
            <Text className="text-white font-bold text-sm">{t("notifications.sign_in", "Sign In")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />
      <CurvedHeader title={t("notifications.title", "Notifications")} showBackButton />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <View className="mx-4 mt-4 mb-1 flex-row items-center">
          <View className="bg-orange-500 px-2.5 py-1 rounded-full mr-2">
            <Text className="text-white text-xs font-bold">{unreadCount}</Text>
          </View>
          <Text className="text-neutral-600 text-sm font-semibold">
            {t("notifications.unread", "Unread")} ({unreadCount})
          </Text>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ea580c" />
          <Text className="text-neutral-500 text-sm mt-3">
            {t("notifications.loading", "Loading notifications...")}
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-orange-50 items-center justify-center mb-4">
            <Ionicons name="notifications-outline" size={40} color="#ea580c" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center">
            {t("notifications.no_notifications_title", "No Notifications Yet")}
          </Text>
          <Text className="text-neutral-500 text-sm text-center mt-1.5 leading-5">
            {t("notifications.no_notifications_subtitle", "When there are new deals nearby or updates on your saved coupons, you'll see them here.")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              router.back();
            }}
            className="bg-orange-500 px-5 py-2.5 rounded-full mt-6"
          >
            <Text className="text-white font-bold text-sm">
              {t("notifications.explore_deals", "Explore Deals")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={handleNotificationPress} />
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={handleRefresh}
              tintColor="#ea580c"
              colors={["#ea580c"]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#ea580c" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
