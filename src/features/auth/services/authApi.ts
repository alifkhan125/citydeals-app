import { apiClient } from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { AuthResponse, User } from "../types";

export const authApi = {
  login: async (credentials: any): Promise<AuthResponse> => {
    const { data } = await apiClient.post<any>(ENDPOINTS.AUTH.LOGIN, credentials);
    return data?.data || data;
  },

  adminLogin: async (credentials: any): Promise<AuthResponse> => {
    const { data } = await apiClient.post<any>(ENDPOINTS.AUTH.ADMIN_LOGIN, credentials);
    return data?.data || data;
  },

  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<any>('/auth/google', { idToken });
    return data?.data || data;
  },

  appleLogin: async (payload: {
    identityToken: string;
    email?: string;
    fullName?: string;
    nonce?: string;
  }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<any>('/auth/apple', payload);
    return data?.data || data;
  },

  register: async (credentials: any): Promise<any> => {
    const { data } = await apiClient.post<any>(ENDPOINTS.AUTH.REGISTER, credentials);
    return data?.data || data;
  },

  verifyRegisterOtp: async (payload: { email: string; otp: string }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<any>(ENDPOINTS.AUTH.VERIFY_REGISTER_OTP, payload);
    return data?.data || data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
  },

  deleteAccount: async (): Promise<{ deleted: boolean; message: string }> => {
    const { data } = await apiClient.delete<any>(ENDPOINTS.USERS.DELETE_ME);
    return data?.data || data;
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get<any>(ENDPOINTS.AUTH.ME);
    return data?.data || data;
  },

  updateProfile: async (payload: {
    fullName?: string;
    phoneNumber?: string;
    profilePictureUrl?: string;
    dateOfBirth?: string;
  }): Promise<User> => {
    const { data } = await apiClient.patch<any>(ENDPOINTS.USERS.ME, payload);
    return data?.data || data;
  },

  uploadAvatar: async (uri: string): Promise<User> => {
    const filename = uri.split("/").pop() || "avatar.jpg";
    const extension = filename.split(".").pop()?.toLowerCase() || "jpg";
    const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";

    const formData = new FormData();
    formData.append("file", {
      uri,
      name: filename,
      type,
    } as any);

    const { data } = await apiClient.post<any>(ENDPOINTS.USERS.AVATAR, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data?.data || data;
  },

  updateLanguage: async (preferredLanguage: string): Promise<User> => {
    const { data } = await apiClient.patch<any>(ENDPOINTS.USERS.LANGUAGE, {
      preferredLanguage,
    });
    return data?.data || data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return data?.data || data;
  },

  verifyOtp: async (payload: { email: string; otp: string }): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.VERIFY_OTP, payload);
    return data?.data || data;
  },

  resetPassword: async (payload: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, payload);
    return data?.data || data;
  },

  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ passwordChanged: boolean }> => {
    const { data } = await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, payload);
    return data?.data || data;
  },
};
