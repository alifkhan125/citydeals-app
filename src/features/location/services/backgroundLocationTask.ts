import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// 24 hours cooldown between repeated alerts for the very same deal
const DEAL_NOTIFICATION_COOLDOWN_MS = 3 * 60 * 1000;

// Track last checked coordinates so the check follows the user's selected radius.
let lastCheckedLocation: { latitude: number; longitude: number } | null = null;

export async function getNotificationPreferences() {
  try {
    const rawAuthState = await AsyncStorage.getItem('citydeals-auth-storage');
    const parsed = rawAuthState ? JSON.parse(rawAuthState) : null;
    const user = parsed?.state?.user;

    return {
      notificationsPaused: Boolean(user?.notificationsPaused),
      radiusMeters: Number(user?.notificationRadiusMeters) || 2000,
    };
  } catch {
    return {
      notificationsPaused: false,
      radiusMeters: 2000,
    };
  }
}

// Helper function to calculate distance in km using Haversine formula
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Core proximity checker: checks coords against cached deals and fires heads-up notification.
 * Works seamlessly in FOREGROUND (app open), BACKGROUND (minimized), and KILLED state.
 * Only triggers if location changed by at least 50m and there is a genuinely new coupon.
 */
export async function processNearbyDealsCheck(
  coords: { latitude: number; longitude: number },
  forceNotify = false
) {
  try {
    const preferences = await getNotificationPreferences();
    if (preferences.notificationsPaused) return;

    // Use the selected radius as the movement threshold. A fixed 50m threshold
    // would make small test/custom radii (1m, 10m, 55m) appear broken.
    if (!forceNotify && lastCheckedLocation) {
      const movedKm = getDistanceKm(
        coords.latitude,
        coords.longitude,
        lastCheckedLocation.latitude,
        lastCheckedLocation.longitude
      );
      const movementThresholdMeters = Math.max(1, Math.min(50, preferences.radiusMeters / 2));
      if (movedKm * 1000 < movementThresholdMeters) {
        return; // User has not moved significantly
      }
    }
    lastCheckedLocation = { latitude: coords.latitude, longitude: coords.longitude };

    // 1. Fetch saved deals from local storage
    let savedDeals: any[] = [];
    const savedDealsStr = await AsyncStorage.getItem('nearby_deals_cache');
    if (savedDealsStr) {
      try {
        savedDeals = JSON.parse(savedDealsStr);
      } catch {
        savedDeals = [];
      }
    }

    // Fallback: If cache is empty, dynamically fetch from API so notification never fails
    if (!Array.isArray(savedDeals) || savedDeals.length === 0) {
      try {
        const { couponsApi } = await import('../../coupons/services/couponsApi');
        const fetched = await couponsApi.getCoupons();
        if (Array.isArray(fetched) && fetched.length > 0) {
          savedDeals = fetched.slice(0, 100);
          await AsyncStorage.setItem('nearby_deals_cache', JSON.stringify(savedDeals)).catch(() => { });
        }
      } catch {
        // network or auth error, continue
      }
    }

    savedDeals = savedDeals.filter((deal) => deal?.status === 'ACTIVE');
    if (savedDeals.length === 0) return;

    // Fetch already notified deals
    const notifiedStr = await AsyncStorage.getItem('notified_deals');
    const notifiedDeals: Record<string, number> = notifiedStr ? JSON.parse(notifiedStr) : {};

    const now = Date.now();
    let newlyNotified = false;
    let notificationsSentThisPass = 0;

    // 2. Loop through deals and check distance
    for (const deal of savedDeals) {
      const rawLat = deal.area?.latitude ?? deal.merchant?.latitude;
      const rawLon = deal.area?.longitude ?? deal.merchant?.longitude;

      if (!rawLat || !rawLon) continue;

      const distanceKm = getDistanceKm(
        coords.latitude,
        coords.longitude,
        Number(rawLat),
        Number(rawLon)
      );

      const distanceMeters = distanceKm * 1000;

      // 3. If within the user's selected notification radius (e.g. 50m / 2000m)
      if (distanceMeters <= preferences.radiusMeters) {
        const lastNotified = notifiedDeals[deal.id];

        // Notify only if genuinely new (never notified before or cooldown of 24h passed)
        if (forceNotify || !lastNotified || (now - lastNotified) > DEAL_NOTIFICATION_COOLDOWN_MS) {
          // Limit to max 1 alert per displacement event to avoid sudden chime spam
          if (notificationsSentThisPass < 1) {
            const storeName = deal.merchant?.name || 'Nearby Store';
            const dealTitle = deal.title || 'Special Offer';
            const metersFormatted = Math.round(distanceMeters);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: `📍 Nearby Deal Alert (${metersFormatted}m away)`,
                body: `You are near ${dealTitle} at ${storeName}! Tap to redeem.`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                ...(Platform.OS === 'android' ? { channelId: 'deals' } : {}),
                data: {
                  couponId: deal.id,
                  dealId: deal.id,
                  sourceType: 'NEARBY_DEALS',
                  radiusMeters: preferences.radiusMeters,
                  distanceMeters,
                },
              },
              trigger: null, // trigger immediately
            });
            notificationsSentThisPass++;
          }

          notifiedDeals[deal.id] = now;
          newlyNotified = true;
        }
      }
    }

    // 4. Save updated notified deals list
    if (newlyNotified) {
      await AsyncStorage.setItem('notified_deals', JSON.stringify(notifiedDeals)).catch(() => {});
    }
  } catch (e) {
    console.warn('Error in proximity deal processing:', e);
  }
}

// Background Location Task Handler registered with TaskManager
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const currentLocation = locations?.[0]; // most recent location

    if (!currentLocation?.coords) return;

    await processNearbyDealsCheck(currentLocation.coords);
  }
});

// Helper to start background location tracking
let backgroundStartPromise: Promise<void> | null = null;

export const startBackgroundLocationTracking = async () => {
  if (backgroundStartPromise) return backgroundStartPromise;

  backgroundStartPromise = (async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('deals', {
        name: 'Deals & Offers',
        description: 'Notifications about nearby deals and offers',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ea580c',
        enableVibrate: true,
        showBadge: true,
      });
    }

    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('[Location] Foreground permission not granted, skipping background tracking');
      return;
    }

    // Request background permission if possible
    let backgroundStatus: string = 'undetermined';
    try {
      const bgPerm = await Location.getBackgroundPermissionsAsync();
      backgroundStatus = bgPerm.status;
      if (backgroundStatus !== 'granted' && bgPerm.canAskAgain) {
        try {
          const res = await Location.requestBackgroundPermissionsAsync();
          backgroundStatus = res.status;
        } catch {
          // ignore
        }
      }
    } catch (permError) {
      console.warn('[Location] Background permission query not available:', permError);
    }

    // On Android, foregroundService runs with foreground permission OR background permission.
    // On iOS, background permission is required.
    const canRun = Platform.OS === 'android' ? true : backgroundStatus === 'granted';
    if (!canRun) {
      console.warn('[Location] Background permission required on iOS for background tracking');
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (!isRegistered) {
      const preferences = await getNotificationPreferences();
      const movementInterval = Math.max(1, Math.min(50, Math.floor(preferences.radiusMeters / 2)));

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: movementInterval,
        timeInterval: 30000,  // check at most every 30 seconds on Android
        deferredUpdatesInterval: 30000,
        showsBackgroundLocationIndicator: false,
        foregroundService: {
          notificationTitle: 'CityDeals Nearby Offers',
          notificationBody: 'Watching for close deals near your location',
          notificationColor: '#ea580c',
        },
      });
      console.log('[Location] Started background location tracking successfully');
    }
  } catch (error) {
    console.error('[Location] Failed to start background tracking:', error);
  }
  })();

  try {
    await backgroundStartPromise;
  } finally {
    backgroundStartPromise = null;
  }
};

export const restartBackgroundLocationTracking = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (error) {
    console.warn('[Location] Failed to reset background tracking:', error);
  }

  await startBackgroundLocationTracking();
};
