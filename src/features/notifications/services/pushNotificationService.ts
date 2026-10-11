import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { InteractionManager, Platform } from "react-native";
import { router } from "expo-router";
import { apiClient } from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

let cachedPushToken: string | null = null;
let isPushConfiguredOnDevice = true;
let lastHandledNotificationKey: string | null = null;

function getExpoProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
      ?.projectId
  );
}

/**
 * Register for push notifications and return the native device push token.
 * On Android this is the FCM token. On iOS this is the APNs token.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  // If already fetched, return cached token
  if (cachedPushToken) {
    return cachedPushToken;
  }

  // If already determined that push/Firebase is unconfigured, avoid repeated failing calls
  if (!isPushConfiguredOnDevice) {
    return null;
  }

  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log("[PUSH] Must use physical device for push notifications");
    return null;
  }

  // Check existing permission
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Ask for permission if not granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[PUSH] Notification permission denied");
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ea580c",
    });

    await Notifications.setNotificationChannelAsync("deals", {
      name: "Deals & Offers",
      description: "Notifications about nearby deals and offers",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ea580c",
    });
  }

  try {
    const tokenData =
      Platform.OS === "ios"
        ? await Notifications.getExpoPushTokenAsync(
            getExpoProjectId() ? { projectId: getExpoProjectId() } : undefined
          )
        : await Notifications.getDevicePushTokenAsync();
    const token = String(tokenData.data);
    console.log("[PUSH] Device push token:", token);
    cachedPushToken = token;
    return token;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (
      errorMessage.includes("Firebase") ||
      errorMessage.includes("googleServicesFile")
    ) {
      isPushConfiguredOnDevice = false;
      console.warn(
        "[PUSH] Push notifications (FCM/APNs) are not fully configured yet. Push token registration will be skipped for this session."
      );
    } else {
      console.warn("[PUSH] Failed to get push token:", errorMessage);
    }
    return null;
  }
}

export async function syncPushTokenWithBackend(): Promise<string | null> {
  const token = await registerForPushNotificationsAsync();
  if (!token) {
    return null;
  }

  await apiClient.post(ENDPOINTS.AUTH.PUSH_TOKEN_SYNC, { fcmToken: token });
  return token;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function isTruthy(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

export function navigateToNotificationSource(
  data?: Record<string, unknown> | null
) {
  const couponId = asString(data?.couponId);
  if (couponId) {
    router.push({
      pathname: "/screens/coupon-details" as any,
      params: { id: couponId },
    });
    return;
  }

  const merchantId = asString(data?.merchantId);
  const areaId = asString(data?.areaId);
  const sourceType = asString(data?.sourceType);
  const grouped = isTruthy(data?.grouped);
  if (
    merchantId ||
    areaId ||
    grouped ||
    sourceType === "MERCHANT" ||
    sourceType === "AREA" ||
    sourceType === "NEARBY_DEALS"
  ) {
    router.push({
      pathname: "/(tabs)/nearby" as any,
      params: {
        ...(merchantId ? { merchantId } : {}),
        ...(areaId ? { areaId } : {}),
        ...(grouped ? { source: "nearby-deals" } : {}),
      },
    });
    return;
  }

  router.push("/screens/notifications" as any);
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const notification = response.notification;
  const data = notification.request.content.data as Record<string, unknown> | null;
  const key =
    notification.request.identifier ||
    `${notification.date ?? ""}:${notification.request.content.title ?? ""}`;

  if (key && key === lastHandledNotificationKey) return;
  lastHandledNotificationKey = key;

  console.log("[PUSH] Notification tapped, data:", data);
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => navigateToNotificationSource(data), 150);
  });
}

/**
 * Listen for incoming notifications (foreground) and taps (background / killed)
 */
export function setupNotificationListeners() {
  let isMounted = true;

  // When a notification is received while app is in foreground
  const receivedSubscription =
    Notifications.addNotificationReceivedListener((notification) => {
      console.log("[PUSH] Notification received:", notification.request.content.title);
    });

  // When user taps on a notification
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response && isMounted) {
      setTimeout(() => {
        if (isMounted) handleNotificationResponse(response);
      }, 1000);
    }
  });

  return () => {
    isMounted = false;
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
