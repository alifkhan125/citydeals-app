import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

async function getNotificationPreferences() {
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
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const currentLocation = locations[0]; // most recent location

    if (!currentLocation) return;

    try {
      const preferences = await getNotificationPreferences();
      if (preferences.notificationsPaused) return;

      // 1. Fetch saved deals from local storage
      const savedDealsStr = await AsyncStorage.getItem('nearby_deals_cache');
      if (!savedDealsStr) return;

      const savedDeals = JSON.parse(savedDealsStr);
      
      // Fetch already notified deals
      const notifiedStr = await AsyncStorage.getItem('notified_deals');
      const notifiedDeals = notifiedStr ? JSON.parse(notifiedStr) : {};
      
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      let newlyNotified = false;

      // 2. Loop through deals and check distance
      for (const deal of savedDeals) {
        const rawLat = deal.area?.latitude ?? deal.merchant?.latitude;
        const rawLon = deal.area?.longitude ?? deal.merchant?.longitude;
        
        if (!rawLat || !rawLon) continue;
        
        const distance = getDistanceKm(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          Number(rawLat),
          Number(rawLon)
        );

        // 3. If within the user's selected notification radius
        if (distance <= preferences.radiusMeters / 1000) {
          const lastNotified = notifiedDeals[deal.id];
          
          // Only notify if we haven't notified for this deal in the last 24 hours
          if (!lastNotified || (now - lastNotified) > ONE_DAY_MS) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Nearby Deal Alert!",
                body: `You are near a great deal: ${deal.title || 'Special offer'} at ${deal.merchant?.name || 'a nearby store'}!`,
                data: {
                  couponId: deal.id,
                  dealId: deal.id,
                  sourceType: "NEARBY_DEALS",
                  radiusMeters: preferences.radiusMeters,
                },
              },
              trigger: null, // trigger immediately
            });
            
            notifiedDeals[deal.id] = now;
            newlyNotified = true;
          }
        }
      }

      // 4. Save updated notified deals list
      if (newlyNotified) {
        await AsyncStorage.setItem('notified_deals', JSON.stringify(notifiedDeals));
      }

    } catch (e) {
      console.error('Error in background location processing:', e);
    }
  }
});

// Helper to start the background tracking
export const startBackgroundLocationTracking = async (forceRestart = false) => {
  const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
  if (foregroundStatus === 'granted') {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('deals', {
        name: 'Deals & Offers',
        description: 'Notifications about nearby deals and offers',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ea580c',
      });
    }

    const { status: currentBgStatus } = await Location.getBackgroundPermissionsAsync();
    let backgroundStatus = currentBgStatus;
    
    // Only request if undetermined or not yet granted. (Avoid infinite loop if permanently denied)
    if (backgroundStatus !== 'granted' && backgroundStatus !== 'denied') {
      const res = await Location.requestBackgroundPermissionsAsync();
      backgroundStatus = res.status;
    }
    
    if (backgroundStatus === 'granted') {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered && forceRestart) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      if (!isRegistered || forceRestart) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Better for 10m/50m testing and close-range alerts
          deferredUpdatesInterval: 10000,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "Location Tracking",
            notificationBody: "Tracking your location for nearby deals",
            notificationColor: "#ea580c"
          }
        });
        console.log("Started background location tracking");
      }
    } else {
      console.warn("Background location permission denied");
    }
  }
};
