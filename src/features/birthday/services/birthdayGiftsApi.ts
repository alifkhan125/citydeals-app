import { apiClient } from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

export type BirthdayGift = {
  id: string;
  title: string;
  description: string;
  terms?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  claimStatus?: "CLAIMED" | "REDEEMED" | "EXPIRED" | "CANCELLED" | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  merchant: { id: string; name: string; logoUrl?: string | null; address?: string | null };
  coupon?: { id: string; title: string; couponCode?: string | null; terms?: string | null } | null;
};

export type BirthdayClaim = BirthdayGift & {
  id: string;
  status: "CLAIMED" | "REDEEMED" | "EXPIRED" | "CANCELLED";
  claimCode?: string;
  claimedAt: string;
  redeemedAt?: string | null;
};

export const birthdayGiftsApi = {
  getAvailable: async (): Promise<{ isBirthday: boolean; daysUntilBirthday: number | null; birthdayYear: number; items: BirthdayGift[] }> => {
    const { data } = await apiClient.get<any>(ENDPOINTS.BIRTHDAY_GIFTS.AVAILABLE);
    return data?.data || data;
  },
  claim: async (id: string): Promise<{ alreadyClaimed: boolean; claim: BirthdayClaim }> => {
    const { data } = await apiClient.post<any>(ENDPOINTS.BIRTHDAY_GIFTS.CLAIM(id));
    return data?.data || data;
  },
  getClaims: async (): Promise<BirthdayClaim[]> => {
    const { data } = await apiClient.get<any>(ENDPOINTS.BIRTHDAY_GIFTS.CLAIMS);
    return data?.data || data || [];
  },
};
