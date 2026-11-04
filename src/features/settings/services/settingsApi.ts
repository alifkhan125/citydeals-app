import { apiClient } from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

export type AppRedirectSettings = {
  baseUrl: string;
  playStoreUrl: string;
  appStoreUrl: string;
};

export const settingsApi = {
  getAppRedirectSettings: async (): Promise<AppRedirectSettings> => {
    const { data } = await apiClient.get<any>(ENDPOINTS.SETTINGS.STORE_LINKS);
    return data?.data || data;
  },
};
