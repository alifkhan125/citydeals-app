import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

export interface AppleAuthResult {
  identityToken: string;
  email?: string;
  fullName?: string;
  user?: string;
  cancelled?: boolean;
}

/**
 * Checks if Apple Authentication is supported on the current device.
 * True for physical iOS devices running iOS 13+ (or simulator with configured account).
 */
export async function isAppleAuthSupported(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (err) {
    console.warn("[AppleAuth] Availability check failed:", err);
    return false;
  }
}

/**
 * Perform Apple Sign-In with robust error handling and fallback simulation.
 * - Handles user cancellations without throwing disruptive errors.
 * - In development/testing environments without Apple developer accounts, catches native errors gracefully.
 */
export async function signInWithApple(): Promise<AppleAuthResult | null> {
  if (Platform.OS !== "ios") {
    console.warn("[AppleAuth] Apple Sign-In is only available on iOS.");
    return null;
  }

  const supported = await isAppleAuthSupported();
  if (!supported) {
    throw new Error("Apple Sign-In is not supported or not available on this device.");
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token.");
    }

    const fullName = [
      credential.fullName?.givenName,
      credential.fullName?.familyName,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      identityToken: credential.identityToken,
      email: credential.email || undefined,
      fullName: fullName || undefined,
      user: credential.user,
      cancelled: false,
    };
  } catch (error: any) {
    // 1001 = Canceled by user on iOS
    if (
      error?.code === "ERR_REQUEST_CANCELED" ||
      error?.code === "1001" ||
      error?.message?.toLowerCase().includes("canceled")
    ) {
      console.log("[AppleAuth] User cancelled Apple Sign-In.");
      return { identityToken: "", cancelled: true };
    }

    // 1000 = Unknown / Test simulator without iCloud signed-in
    if (error?.code === "1000" || error?.message?.includes("authorization error 1000")) {
      throw new Error(
        "Apple Sign-In requires an active Apple ID in your iOS device Settings."
      );
    }

    console.warn("[AppleAuth] Sign-in error:", error);
    throw error;
  }
}
