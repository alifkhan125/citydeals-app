export interface MerchantCategory {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
}

export interface Merchant {
  id: string;
  name: string;
  description?: string | null;
  titleText?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  category?: MerchantCategory | null;
}

export interface Area {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  state?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface CouponCategory {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
}

export interface Coupon {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  couponCode: string;
  couponLink?: string | null;
  redemptionLimit?: number | null;
  redemptionFrequency?: string | null;
  discussion?: string | null;
  terms?: string | null;
  shareSlug: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED';
  startsAt?: string | null;
  expiresAt?: string | null;
  areaId?: string;
  merchantId?: string;
  categoryId?: string;
  isWhitelisted?: boolean;
  createdAt: string;
  updatedAt: string;
  merchant?: Merchant | null;
  area?: Area | null;
  category?: CouponCategory | null;
  isSaved?: boolean;
  isRedeemed?: boolean;
  _count?: {
    redemptions: number;
    savedBy: number;
  };
}

export interface CouponFilterParams {
  categoryId?: string;
  categorySlug?: string;
  areaId?: string;
  areaSlug?: string;
  merchantId?: string;
  search?: string;
}
