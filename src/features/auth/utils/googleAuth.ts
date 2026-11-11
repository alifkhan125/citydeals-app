import { Platform } from "react-native";
import type { ConfigureParams } from "@react-native-google-signin/google-signin";

let isConfigured = false;

/**
 * Configure Google Sign-In with native-first configuration:
 * - iOS: Relies on the bundled `GoogleService-Info.plist` (registered via app.json ios.googleServicesFile).
 *        Falls back to EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID only if plist is missing in custom builds.
 * - Android: Uses the backend server web client ID (`webClientId`) alongside native `google-services.json`.
 */
export async function initGoogleSignIn(): Promise<boolean> {
  if (isConfigured) return true;

  try {
    const { GoogleSignin } = await import(
      "@react-native-google-signin/google-signin"
    );

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    const iosClientIdFallback =
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

    const config: ConfigureParams = {
      // Offline access enables returning a server-verifiable Google ID token
      offlineAccess: true,
      scopes: ["profile", "email"],
    };

    if (Platform.OS === "android") {
      // Android requires webClientId to generate idToken for your backend server
      if (webClientId) {
        config.webClientId = webClientId;
      }
    } else if (Platform.OS === "ios") {
      // iOS natively inspects GoogleService-Info.plist bundled in the app.
      // If webClientId is provided, passing it allows verifying tokens against the web client backend.
      if (webClientId) {
        config.webClientId = webClientId;
      }
      // Only set iosClientId if explicitly provided as fallback; otherwise let the native plist resolve it
      if (iosClientIdFallback) {
        config.iosClientId = iosClientIdFallback;
      }
    }

    GoogleSignin.configure(config);
    isConfigured = true;
    return true;
  } catch (error: any) {
    console.warn("[GoogleSignin] Configuration error:", error?.message || error);
    return false;
  }
}

/**
 * Prompt user to sign in with Google and return the ID token.
 * Returns null if the user cancelled or if configuration failed.
 */
export async function signInWithGoogle(): Promise<{
  idToken: string | null;
  user?: any;
  cancelled?: boolean;
} | null> {
  try {
    const ready = await initGoogleSignIn();
    if (!ready) {
      throw new Error("Google Sign-In could not be configured on this device.");
    }

    const { GoogleSignin } = await import(
      "@react-native-google-signin/google-signin"
    );

    // On Android, check Google Play Services availability
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const response = await GoogleSignin.signIn();

    // Check cancellation
    if (response.type === "cancelled") {
      return { idToken: null, cancelled: true };
    }

    const idToken = response.data?.idToken || null;
    return {
      idToken,
      user: response.data?.user,
      cancelled: false,
    };
  } catch (error: any) {
    const { statusCodes } = await import(
      "@react-native-google-signin/google-signin"
    );

    if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
      return { idToken: null, cancelled: true };
    } else if (error?.code === statusCodes?.IN_PROGRESS) {
      console.warn("[GoogleSignin] Sign in already in progress");
      return null;
    } else if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services are not available or out of date.");
    }

    throw error;
  }
}

/**
 * Helper to sign out of Google session locally
 */
export async function signOutGoogle(): Promise<void> {
  try {
    const { GoogleSignin } = await import(
      "@react-native-google-signin/google-signin"
    );
    await GoogleSignin.signOut();
  } catch {
    // Ignore signout cleanup errors
  }
}
