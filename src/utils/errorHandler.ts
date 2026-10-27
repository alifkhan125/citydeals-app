import { AxiosError } from "axios";
import { ApiErrorResponse } from "../features/auth/types";

export const handleApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (
      error.code === "ECONNABORTED" ||
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error"
    ) {
      return "Cannot connect to server. Please check your internet connection or backend server.";
    }

    const data = error.response?.data as ApiErrorResponse;
    if (data && data.message) {
      // Handle cases where the backend sends an array of validation errors
      if (Array.isArray(data.message)) {
        return data.message.join(", ");
      }
      return data.message;
    }
    if (error.message) {
      return error.message;
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  
  return "An unexpected error occurred. Please try again.";
};
