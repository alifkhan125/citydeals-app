import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { InteractionManager, Platform } from "react-native";
import { router } from "expo-router";
import { apiClient } from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { toast } from "sonner-native";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
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

export async function setupAndroidNotificationChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#ea580c",
  });

  await Notifications.setNotificationChannelAsync("deals", {
    name: "Deals & Offers",
    description: "Notifications about nearby deals and offers",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#ea580c",
    enableVibrate: true,
    showBadge: true,
  });
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

  // Android requires notification channels
  if (Platform.OS === "android") {
    await setupAndroidNotificationChannels();
  }

  try {
    let token: string | null = null;

    if (Platform.OS === "ios") {
      const tokenData = await Notifications.getExpoPushTokenAsync(
        getExpoProjectId() ? { projectId: getExpoProjectId() } : undefined
      );
      token = String(tokenData.data);
    } else {
      // Android: attempt native FCM device token first
      try {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        if (tokenData?.data) {
          token = String(tokenData.data);
        }
      } catch (fcmError: any) {
        console.warn(
          "[PUSH] Native FCM token retrieval failed, attempting Expo push token fallback:",
          fcmError?.message || fcmError
        );
      }

      // If native FCM token wasn't retrieved, fall back to Expo push token
      if (!token) {
        try {
          const expoTokenData = await Notifications.getExpoPushTokenAsync(
            getExpoProjectId() ? { projectId: getExpoProjectId() } : undefined
          );
          if (expoTokenData?.data) {
            token = String(expoTokenData.data);
          }
        } catch (expoErr: any) {
          console.warn("[PUSH] Expo push token fallback also failed:", expoErr?.message || expoErr);
        }
      }
    }

    if (token) {
      console.log("[PUSH] Resolved push token:", token);
      cachedPushToken = token;
      return token;
    }

    console.warn("[PUSH] No push token could be resolved.");
    return null;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.warn("[PUSH] Failed to get push token:", errorMessage);
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

  if (Platform.OS === "android") {
    setupAndroidNotificationChannels().catch(() => {});
  }

  // When a notification is received while app is in foreground
  const receivedSubscription =
    Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title;
      const body = notification.request.content.body;
      console.log("[PUSH] Notification received in foreground:", title, body);

      if (title || body) {
        toast.info(title || "New Notification", {
          description: body || undefined,
        });
      }
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
