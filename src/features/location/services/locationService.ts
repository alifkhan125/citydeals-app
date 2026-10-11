import * as Location from "expo-location";
import { apiClient } from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { useLocationStore } from "../store/useLocationStore";
import { LocationCoords } from "../types";
import { areasApi } from "../../areas/services/areasApi";

export const formatLocationName = (
  address: Location.LocationGeocodedAddress
): string => {
  let areaPart =
    address.district || address.street || address.name || address.subregion;

  if (
    address.street &&
    address.name &&
    address.name !== address.street &&
    isNaN(Number(address.street))
  ) {
    areaPart = address.street;
  }

  const cityPart = address.city || address.subregion || address.region;
  const countryPart = address.country;

  if (
    areaPart &&
    cityPart &&
    areaPart.toLowerCase() !== cityPart.toLowerCase()
  ) {
    return `${areaPart}, ${cityPart}`;
  }

  if (
    cityPart &&
    countryPart &&
    cityPart.toLowerCase() !== countryPart.toLowerCase()
  ) {
    return `${cityPart}, ${countryPart}`;
  }

  return areaPart || cityPart || countryPart || "Current Location";
};

export const locationService = {
  /**
   * Request user permission and fetch current GPS position + reverse geocode location name
   */
  requestAndGetLocation: async (): Promise<{
    coords: LocationCoords | null;
    locationName: string;
    addressDetails: Location.LocationGeocodedAddress | null;
  }> => {
    const locationStore = useLocationStore.getState();
    locationStore.setIsLoading(true);

    try {
      // 1. Check existing permission status first
      let { status } = await Location.getForegroundPermissionsAsync();

      // If not granted, request permission from user
      if (status !== Location.PermissionStatus.GRANTED) {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      locationStore.setPermissionStatus(status);

      if (status !== Location.PermissionStatus.GRANTED) {
        locationStore.setError("Location permission was denied");
        return {
          coords: null,
          locationName: locationStore.locationName || "Location Disabled",
          addressDetails: null,
        };
      }

      // Check if location services (GPS toggle) is enabled on the device
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          locationStore.setError("Location services are disabled on device");
        }
      } catch {
        // ignore
      }

      // 2. Fetch current GPS position with highest satellite accuracy (with fallbacks)
      let position: Location.LocationObject | null = null;
      try {
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
      } catch {
        try {
          position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
        } catch {
          // Fallback to last known position if immediate GPS lock fails
          position = await Location.getLastKnownPositionAsync();
        }
      }

      if (!position) {
        throw new Error("Unable to retrieve device coordinates");
      }

      const coords: LocationCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const fallbackLocationName =
        locationStore.locationName ||
        `Lat: ${coords.latitude.toFixed(6)}, Lon: ${coords.longitude.toFixed(6)}`;

      // Update coordinates immediately so pull-to-refresh is not blocked by
      // reverse geocoding, area resolving, push token fetch, or background task setup.
      locationStore.setLocation(coords, fallbackLocationName, null);
      locationService.enrichLocationInBackground(coords);

      return { coords, locationName: fallbackLocationName, addressDetails: null };
    } catch (err: any) {
      console.warn("Location error:", err);
      locationStore.setError(err.message || "Failed to get location");
      return {
        coords: null,
        locationName: locationStore.locationName || "Current Location",
        addressDetails: null,
      };
    } finally {
      locationStore.setIsLoading(false);
    }
  },

  enrichLocationInBackground: async (coords: LocationCoords) => {
    // Reverse geocode to get human-readable address
    try {
      const addresses = await Location.reverseGeocodeAsync(coords);
      if (addresses && addresses.length > 0) {
        const addressDetails = addresses[0];
        useLocationStore
          .getState()
          .setLocation(coords, formatLocationName(addressDetails), addressDetails);
      }
    } catch (geocodeErr) {
      console.warn("Reverse geocode failed, using coordinates", geocodeErr);
    }

    // Auto resolve closest backend Area
    try {
      const resolvedArea = await areasApi.resolveArea(coords);
      useLocationStore.getState().setMatchedArea(resolvedArea);
    } catch (areaErr) {
      console.warn("Failed to resolve nearest area:", areaErr);
    }

    // If user is logged in, sync location with backend API
    const authState = useAuthStore.getState();
    if (authState.isAuthenticated) {
      locationService.syncLocationWithBackend(coords).catch((err) => {
        console.warn("Failed to sync location with backend:", err);
      });
    }

    // Start background location tracking for nearby deals
    import("./backgroundLocationTask")
      .then(({ startBackgroundLocationTracking }) => startBackgroundLocationTracking())
      .catch((err) => {
        console.warn("Failed to start background tracking:", err);
      });
  },

  syncLocationWithBackend: async (coords: LocationCoords) => {
    try {
      const { registerForPushNotificationsAsync } = await import(
        "../../notifications/services/pushNotificationService"
      );
      const fcmToken = await registerForPushNotificationsAsync();

      const response = await apiClient.post<any>(ENDPOINTS.AUTH.LOCATION_SYNC, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        fcmToken: fcmToken || undefined,
      });

      const updatedData = response.data?.data || response.data;
      if (updatedData) {
        useAuthStore.getState().updateUser({
          latitude: coords.latitude,
          longitude: coords.longitude,
          areaId: updatedData.areaId,
          area: updatedData.area,
        });
      }
      return updatedData;
    } catch (error) {
      console.warn("Backend location sync failed:", error);
    }
  },
};
