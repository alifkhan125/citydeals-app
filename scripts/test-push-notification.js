#!/usr/bin/env node

/**
 * CityDeals Push Notification Manual Testing Script
 *
 * Usage:
 *   node scripts/test-push-notification.js <EXPO_PUSH_TOKEN>
 *
 * Example:
 *   node scripts/test-push-notification.js "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 */

const https = require("https");

const token = process.argv[2];

if (!token) {
  console.log(`
==============================================================================
📱 CityDeals Manual Push Notification Test Helper
==============================================================================

Usage:
  node scripts/test-push-notification.js <TOKEN>

Options:
  1. Expo Push Token:
     node scripts/test-push-notification.js "ExponentPushToken[...]"

  2. Firebase Dashboard (Android FCM Token):
     Go to Firebase Console -> Engage -> Messaging -> "New campaign"
     Click "Send test message" / "Test on device"
     Paste your Android FCM Token.

  3. Apple Push Notification (iOS APNs Token):
     On iOS, expo-notifications generates a native 64-character APNs token.
     Test using macOS 'PushNotification' app, Pusher, or your backend API.
==============================================================================
`);
  process.exit(1);
}

if (token.startsWith("ExponentPushToken")) {
  console.log(`Sending test push notification to Expo token: ${token}...`);

  const payload = JSON.stringify({
    to: token,
    sound: "default",
    title: "CityDeals Manual Test 🚀",
    body: "Push notification test delivered successfully!",
    data: {
      type: "TEST",
      timestamp: Date.now(),
    },
  });

  const req = https.request(
    "https://exp.host/--/api/v2/push/send",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        Accept: "application/json",
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          console.log("\n✅ Response from Expo Push Service:");
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          console.log("\nResponse:", data);
        }
      });
    }
  );

  req.on("error", (error) => {
    console.error("❌ Request failed:", error.message);
  });

  req.write(payload);
  req.end();
} else {
  console.log(`
Token received: ${token}

This appears to be a native device token:
- Length: ${token.length} characters
- Format: ${token.length === 64 ? "Apple APNs Device Token (iOS)" : "Firebase FCM Token (Android)"}

Testing Options:
1. If this is an Android FCM Token:
   - Open Firebase Console: https://console.firebase.google.com/project/citydeals-app/notification
   - Click 'Send test message' -> paste this token.

2. If this is an iOS APNs Token:
   - Test directly via APNs tool (e.g. Pusher app or APNs HTTP/2 with bundle id 'ai.citydeals.app').
   - Or run with your Expo Push Token using:
     node scripts/test-push-notification.js "ExponentPushToken[...]"
`);
}
