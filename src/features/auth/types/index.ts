export type Role = "ADMIN" | "ADVERTISER" | "USER";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED";

export interface Area {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  radiusMeters?: number;
}

export interface UserStats {
  savedCoupons?: number;
  couponRedeemed?: number;
  unreadNotifications?: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  dateOfBirth?: string | null;
  notificationsPaused?: boolean;
  role: Role;
  status: UserStatus;
  areaId?: string | null;
  area?: Area | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  notificationRadiusMeters?: number;
  stats?: UserStats;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
}
