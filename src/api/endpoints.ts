export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    ADMIN_LOGIN: "/auth/admin-login",
    REGISTER: "/auth/register",
    VERIFY_REGISTER_OTP: "/auth/verify-register-otp",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    FORGOT_PASSWORD: "/auth/forgot-password",
    VERIFY_OTP: "/auth/verify-otp",
    RESET_PASSWORD: "/auth/reset-password",
    CHANGE_PASSWORD: "/auth/change-password",
    LOCATION_SYNC: "/auth/location/sync",
    PUSH_TOKEN_SYNC: "/auth/push-token/sync",
  },
  USERS: {
    ME: "/me",
    DELETE_ME: "/me",
    AVATAR: "/me/avatar",
    LANGUAGE: "/me/language",
  },
  UPLOAD: {
    FILE: "/upload",
    BASE64: "/upload/base64",
  },
  COUPONS: {
    LIST: "/coupons",
    SAVED: "/coupons/saved",
    REDEEMED: "/coupons/redeemed",
  },
  CATEGORIES: {
    LIST: "/categories",
  },
  AREAS: {
    LIST: "/areas",
    RESOLVE: "/areas/resolve",
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    SETTINGS: "/me/notifications",
  },
  BIRTHDAY_GIFTS: {
    AVAILABLE: "/birthday-gifts/available",
    CLAIMS: "/birthday-gifts/my-claims",
    CLAIM: (id: string) => `/birthday-gifts/${id}/claim`,
  },
  SETTINGS: {
    STORE_LINKS: "/settings/store-links",
  },
  SUPPORT: {
    CREATE_TICKET: "/support/tickets",
  },
  LEGAL: {
    TERMS: "/legal/terms",
    PAGES: "/legal/pages",
    PAGE: (type: string) => `/legal/pages/${type}`,
  },
};

