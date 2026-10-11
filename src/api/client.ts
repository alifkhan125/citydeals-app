import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { tokenService } from "../features/auth/services/tokenService";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { ENDPOINTS } from "./endpoints";
import { AuthTokens } from "../features/auth/types";

// Use the base URL from the .env file (must be prefixed with EXPO_PUBLIC_)
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.request.use(
  async (config) => {
    let token = tokenService.getAccessToken();
    if (!token) {
      await tokenService.loadTokens();
      token = tokenService.getAccessToken();
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      let refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) {
        refreshToken = await tokenService.getRefreshTokenAsync();
      }

      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      
      if (!refreshToken) {
        if (isAuthenticated) {
          useAuthStore.getState().clearSession();
        }
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<any>(
          `${BASE_URL}${ENDPOINTS.AUTH.REFRESH}`,
          { refreshToken }
        );

        const newTokens: AuthTokens =
          response.data?.data?.tokens || response.data?.tokens;

        if (!newTokens?.accessToken) {
          throw new Error("Invalid token refresh payload from server");
        }

        await tokenService.saveTokens(newTokens);

        const freshUser = response.data?.data?.user || response.data?.user;
        if (freshUser) {
          useAuthStore.getState().updateUser(freshUser);
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${newTokens.accessToken}`;
        
        processQueue(null, newTokens.accessToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        }
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (isAuthenticated) {
          useAuthStore.getState().clearSession();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
