import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

export interface PushTokensInfo {
  deviceToken: string | null;
  deviceTokenType: "apns" | "fcm" | string | null;
  expoPushToken: string | null;
  status: string;
  platform: string;
  isDevice: boolean;
}

let cachedPushTokensInfo: PushTokensInfo = {
  deviceToken: null,
  deviceTokenType: null,
  expoPushToken: null,
  status: "undetermined",
  platform: Platform.OS,
  isDevice: Boolean(Device.isDevice),
};

let cachedPushToken: string | null = null;
let lastHandledNotificationKey: string | null = null;
let isBannerLogged = false;

export function getCachedPushTokensInfo(): PushTokensInfo {
  return cachedPushTokensInfo;
}

function printPushTokensBanner(info: PushTokensInfo) {
  const isIos = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  console.log("\n" + "=".repeat(78));
  console.log("📱 [PUSH NOTIFICATION TOKENS - MANUAL TESTING]");
  console.log("=".repeat(78));
  console.log(`Platform     : ${info.platform.toUpperCase()}`);
  console.log(
    `Device       : ${
      info.isDevice ? "Physical Device" : "Simulator / Emulator"
    }`
  );
  console.log(`Permission   : ${info.status.toUpperCase()}`);
  console.log("-".repeat(78));

  if (isAndroid && info.deviceToken) {
    console.log("🔥 Firebase FCM Registration Token (for Firebase Dashboard / Console):");
    console.log(info.deviceToken);
    console.log("-".repeat(78));
  } else if (isIos && info.deviceToken) {
    console.log("🍏 iOS APNs Native Device Token:");
    console.log(info.deviceToken);
    console.log("-".repeat(78));
  } else if (!info.deviceToken) {
    const label = isIos ? "iOS APNs Device Token" : "Android FCM Registration Token";
    console.log(`⚠️ Native ${label}: NOT AVAILABLE`);
    if (!info.isDevice) {
      console.log(
        "   👉 Reason: Native APNs tokens require a physical iOS device."
      );
    } else if (info.status !== "granted") {
      console.log(
        "   👉 Reason: Notification permission was not granted by the user."
      );
    }
    console.log("-".repeat(78));
  }

  if (info.expoPushToken) {
    console.log("🚀 Expo Push Token (Universal Web & API Tester):");
    console.log(info.expoPushToken);
    console.log("-".repeat(78));
  }

  console.log("🔥 HOW TO TEST MANUALLY ON FIREBASE DASHBOARD / CONSOLE:");
  if (isAndroid && info.deviceToken) {
    console.log("1. Go to Firebase Console > Engage > Messaging > 'New campaign' (or 'Send your first message')");
    console.log("2. Click 'Send test message' / 'Test on device'");
    console.log("3. Paste the Firebase FCM Registration Token above and click 'Test'.");
  } else if (isIos) {
    console.log("ℹ️  Firebase Console 'Test on device' requires an FCM token.");
    console.log("   • On iOS, expo-notifications uses Apple's native APNs directly (the APNs token above).");
    console.log("   • To test notifications on iOS manually:");
    console.log("     A) Expo Web Tool (Easiest & Instant):");
    console.log("        Visit https://expo.dev/notifications, paste the Expo Push Token above, and click 'Send'.");
    console.log("     B) Native APNs / Push Tools:");
    console.log("        Use macOS 'PushNotification' or Pusher app with the APNs token above and bundle ID 'ai.citydeals.app'.");
    console.log("     C) Firebase Backend / Server API:");
    console.log("        Ensure your APNs Key (.p8) is uploaded in Firebase Project Settings > Cloud Messaging > Apple app configuration.");
    console.log("        Your backend / Firebase Admin SDK can then dispatch push alerts directly to this device.");
  }
  console.log("=".repeat(78) + "\n");
}

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
 * Register for native push notifications on app launch:
 * - Prompts for notification permissions if not already decided.
 * - Resolves the native iOS APNs token (or Android FCM token).
 * - Resolves the Expo Push Token.
 * - Prints copy-pasteable tokens in the console for manual testing.
 */
export async function registerForPushNotificationsAsync(options?: {
  forceRefresh?: boolean;
}): Promise<string | null> {
  if (cachedPushToken && !options?.forceRefresh) {
    if (!isBannerLogged) {
      printPushTokensBanner(cachedPushTokensInfo);
      isBannerLogged = true;
    }
    return cachedPushToken;
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

    cachedPushTokensInfo.status = finalStatus;

    if (finalStatus !== "granted") {
      console.log(
        `[PUSH] Notification permission status: ${finalStatus}. Notifications disabled by user.`
      );
      printPushTokensBanner(cachedPushTokensInfo);
      isBannerLogged = true;
      return null;
    }

    if (Platform.OS === "android") {
      await setupAndroidNotificationChannels();
    }

    // 1. Resolve Native Device Push Token (APNs on iOS, FCM on Android)
    let deviceToken: string | null = null;
    let deviceTokenType: string | null = Platform.OS === "ios" ? "apns" : "fcm";

    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      if (tokenData?.data) {
        deviceToken = String(tokenData.data);
        if (tokenData.type) {
          deviceTokenType =
            tokenData.type === "ios" ? "apns" : String(tokenData.type);
        }
      }
    } catch (deviceTokenErr: any) {
      if (Device.isDevice) {
        console.warn(
          `[PUSH] getDevicePushTokenAsync failed on ${Platform.OS}:`,
          deviceTokenErr?.message || deviceTokenErr
        );
      }
    }

    // 2. Resolve Expo Push Token (fallback / testing web tool)
    let expoPushToken: string | null = null;
    try {
      const expoTokenData = await Notifications.getExpoPushTokenAsync();
      if (expoTokenData?.data) {
        expoPushToken = String(expoTokenData.data);
      }
    } catch (expoTokenErr: any) {
      // Ignored if EAS projectId is not configured in app.json
    }

    const primaryToken = deviceToken || expoPushToken;

    cachedPushTokensInfo = {
      deviceToken,
      deviceTokenType,
      expoPushToken,
      status: finalStatus,
      platform: Platform.OS,
      isDevice: Boolean(Device.isDevice),
    };

    if (primaryToken) {
      cachedPushToken = primaryToken;
      AsyncStorage.setItem(
        "citydeals_push_token_info",
        JSON.stringify(cachedPushTokensInfo)
      ).catch(() => {});
    }

    printPushTokensBanner(cachedPushTokensInfo);
    isBannerLogged = true;

    return primaryToken;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.warn(
      `[PUSH] Native push token registration bypassed (${Platform.OS}):`,
      errorMsg
    );
    return null;
  }
}

/**
 * Send an immediate local test notification (useful for verifying banners, sounds, and UI)
 */
export async function sendLocalTestNotification(
  title: string = "CityDeals Push Test",
  body: string = "Your push notification system is working perfectly!"
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { test: true, timestamp: Date.now() },
      },
      trigger: null, // deliver immediately
    });
    return true;
  } catch (err: any) {
    console.warn("[PUSH] sendLocalTestNotification failed:", err?.message || err);
    return false;
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

    const response = await apiClient.post(ENDPOINTS.AUTH.PUSH_TOKEN_SYNC, { fcmToken: token });
    if (response?.data) {
      console.log("[PUSH] Backend push token sync successful:", response.data);
    }
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
  setTimeout(() => navigateToNotificationSource(data), 150);
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
