import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
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
let lastHandledNotificationKey: string | null = null;
let isPushWarningLogged = false;

export async function setupAndroidNotificationChannels() {
  if (Platform.OS !== "android") return;

  try {
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
  } catch (error) {
    console.warn("[PUSH] Android channel setup failed:", error);
  }
}

/**
 * Register for native push notifications and return the direct native device push token:
 * - Android: Native FCM registration token
 * - iOS: Native APNs device push token
 *
 * Graceful Fallback / Test Mode:
 * - If running in iOS Simulator or Android emulator, logs a safe informational message without throwing or breaking runtime.
 * - If push credentials / entitlements are pending, returns null cleanly.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (cachedPushToken) {
    return cachedPushToken;
  }

  // Push notifications require a physical device on iOS and Android
  if (!Device.isDevice) {
    if (!isPushWarningLogged) {
      console.log(
        `[PUSH] Running on ${Platform.OS} simulator/emulator. Push token registration runs in test mode (no physical APNs/FCM available).`
      );
      isPushWarningLogged = true;
    }
    return null;
  }

  try {
    // Check & request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[PUSH] Notification permissions were not granted by the user.");
      return null;
    }

    if (Platform.OS === "android") {
      await setupAndroidNotificationChannels();
    }

    // Attempt native token resolution: APNs on iOS, FCM on Android
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = tokenData?.data ? String(tokenData.data) : null;

    if (token) {
      console.log(`[PUSH] Plug-and-play active: native ${Platform.OS.toUpperCase()} push token resolved:`, token);
      cachedPushToken = token;
      return token;
    }

    console.warn(`[PUSH] Device token could not be resolved on ${Platform.OS}.`);
    return null;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    // Non-blocking fallback for development/test mode
    console.warn(
      `[PUSH] Native push token registration bypassed (${Platform.OS}):`,
      errorMsg
    );
    return null;
  }
}

/**
 * Synchronize the native push token with your backend database
 */
export async function syncPushTokenWithBackend(): Promise<string | null> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) {
      return null;
    }

    await apiClient.post(ENDPOINTS.AUTH.PUSH_TOKEN_SYNC, { fcmToken: token });
    return token;
  } catch (err: any) {
    console.warn("[PUSH] Push token backend sync bypassed:", err?.message || err);
    return null;
  }
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function isTruthy(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

/**
 * Route user based on notification data payload (supports native FCM and APNs keys)
 */
export function navigateToNotificationSource(
  data?: Record<string, unknown> | null
) {
  if (!data) {
    router.push("/screens/notifications" as any);
    return;
  }

  const sourceType = asString(data.sourceType || data.type);
  const birthdayGiftId = asString(data.giftId || data.birthdayGiftId);

  if (birthdayGiftId || sourceType === "BIRTHDAY_GIFT" || sourceType === "BIRTHDAY") {
    router.push({
      pathname: "/screens/birthday-gift" as any,
      params: birthdayGiftId ? { giftId: birthdayGiftId } : undefined,
    });
    return;
  }

  const couponId = asString(data.couponId || data.dealId || data.id);
  if (couponId && sourceType !== "MERCHANT" && sourceType !== "AREA") {
    router.push({
      pathname: "/screens/coupon-details" as any,
      params: { id: couponId },
    });
    return;
  }

  const merchantId = asString(data.merchantId);
  const areaId = asString(data.areaId);
  const grouped = isTruthy(data.grouped);

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

  console.log("[PUSH] Native notification tapped, payload:", data);
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => navigateToNotificationSource(data), 150);
  });
}

/**
 * Listen for incoming notifications (foreground) and taps (background / cold start)
 */
export function setupNotificationListeners() {
  let isMounted = true;

  if (Platform.OS === "android") {
    setupAndroidNotificationChannels().catch(() => {});
  }

  // 1. Foreground notification handler
  const receivedSubscription =
    Notifications.addNotificationReceivedListener((notification) => {
      const title = notification.request.content.title;
      const body = notification.request.content.body;
      console.log("[PUSH] Foreground notification received:", title, body);

      if (title || body) {
        toast.info(title || "New Notification", {
          description: body || undefined,
        });
      }
    });

  // 2. Background tap response handler
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  // 3. Cold start handler (app opened from killed state by notification tap)
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response && isMounted) {
      setTimeout(() => {
        if (isMounted) handleNotificationResponse(response);
      }, 1000);
    }
  }).catch((err) => {
    console.warn("[PUSH] Cold-start check bypassed:", err?.message || err);
  });

  return () => {
    isMounted = false;
    try {
      receivedSubscription.remove();
      responseSubscription.remove();
    } catch {
      // safe cleanup
    }
  };
}
