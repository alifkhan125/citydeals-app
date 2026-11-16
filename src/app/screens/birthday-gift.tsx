import React, { useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import CurvedHeader from "../../components/CurvedHeader";
import DealCard, { type DealItem } from "../../components/DealCard";
import { useBirthdayGifts, useClaimBirthdayGift } from "../../features/birthday/hooks/useBirthdayGifts";
import { useResponsive } from "../../utils/useResponsive";

export default function BirthdayGiftScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useBirthdayGifts();
  const claimMutation = useClaimBirthdayGift();
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const { isWide, itemWidthPercent } = useResponsive();

  const claim = async (id: string) => {
    try {
      const result = await claimMutation.mutateAsync(id);
      setClaimedCode(result.claim.claimCode ?? null);
      Alert.alert(result.alreadyClaimed ? "Already claimed" : "Gift claimed", result.alreadyClaimed ? "You already claimed this gift." : "Show this code to the business when you redeem your gift.");
    } catch (error: any) {
      Alert.alert("Unable to claim gift", error?.response?.data?.message || "This gift is available only on your birthday.");
    }
  };

  return <View className="flex-1 bg-neutral-50">
    <StatusBar style="light" />
    <CurvedHeader title="Birthday Gift" showBackButton />
    {isLoading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color="#ea580c" size="large" /></View> : isError ? <View className="flex-1 items-center justify-center px-8"><Ionicons name="cloud-offline-outline" size={48} color="#ea580c" /><Text className="text-lg font-bold text-neutral-900 mt-4">Could not load your gift</Text><TouchableOpacity onPress={() => refetch()} className="bg-orange-500 rounded-full px-6 py-3 mt-5"><Text className="text-white font-bold">Try again</Text></TouchableOpacity></View> : <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => { void refetch(); }} tintColor="#ea580c" colors={["#ea580c"]} />}>
      {data?.items?.length ? (
        <View style={isWide ? { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "space-between" } : undefined}>
          {data.items.map((gift) => {
            const claimed = gift.claimStatus === "CLAIMED" || gift.claimStatus === "REDEEMED";
            const deal: DealItem = {
              id: gift.id,
              image: gift.imageUrl || undefined,
              dealHeading: gift.title,
              dealDescription: gift.description,
              merchantName: gift.merchant.name,
            };
            return (
              <View
                key={gift.id}
                style={isWide ? { width: itemWidthPercent, flexGrow: 1 } : { width: "100%", marginBottom: 4 }}
              >
                <DealCard
                  deal={deal}
                  actionTitle={claimed ? (gift.claimStatus === "REDEEMED" ? "Redeemed" : "Already claimed") : data.isBirthday ? "Claim Birthday Gift" : `Available in ${data.daysUntilBirthday ?? 1} day${data.daysUntilBirthday === 1 ? "" : "s"}`}
                  actionDisabled={claimed || !data.isBirthday}
                  actionLoading={claimMutation.isPending}
                  onPressOpen={() => { if (!claimed && data.isBirthday) void claim(gift.id); }}
                />
                {gift.expiresAt || gift.terms ? <View className="-mt-4 mb-5 px-5"><Text className="text-xs text-neutral-400">{gift.expiresAt ? `Valid until ${new Date(gift.expiresAt).toLocaleDateString()}` : ""}{gift.expiresAt && gift.terms ? " • " : ""}{gift.terms ? `Terms: ${gift.terms}` : ""}</Text></View> : null}
                {claimedCode && claimed && <View className="-mt-3 mb-5 mx-1 bg-green-50 rounded-xl p-3"><Text className="text-green-800 text-lg font-extrabold">{claimedCode}</Text><TouchableOpacity onPress={() => { Clipboard.setStringAsync(claimedCode); Alert.alert("Copied", "Claim code copied to clipboard."); }}><Text className="text-green-700 font-bold mt-2">Copy claim code</Text></TouchableOpacity></View>}
              </View>
            );
          })}
        </View>
      ) : <View className="items-center py-10"><Ionicons name="gift-outline" size={48} color="#f97316" /><Text className="text-neutral-600 mt-3 text-center">No birthday gifts are available right now.</Text></View>}
    </ScrollView>}
  </View>;
}
