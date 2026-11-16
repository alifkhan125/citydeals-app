import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { birthdayGiftsApi } from "../services/birthdayGiftsApi";

export const BIRTHDAY_GIFTS_QUERY_KEY = ["birthday-gifts"] as const;

export function useBirthdayGifts() {
  return useQuery({ queryKey: BIRTHDAY_GIFTS_QUERY_KEY, queryFn: birthdayGiftsApi.getAvailable, staleTime: 30_000 });
}

export function useClaimBirthdayGift() {
  const client = useQueryClient();
  return useMutation({ mutationFn: birthdayGiftsApi.claim, onSuccess: () => client.invalidateQueries({ queryKey: BIRTHDAY_GIFTS_QUERY_KEY }) });
}
