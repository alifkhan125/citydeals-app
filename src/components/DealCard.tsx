import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import PrimaryButton from "./PrimaryButton";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "../features/auth/store/useAuthStore";

export interface DealItem {
  id: string;
  category?: string;
  image?: ImageSourcePropType | string;
  dealHeading: string;
  dealDescription: string;
  isFavorite?: boolean;
  distance?: string;
  merchantName?: string;
}

interface DealCardProps {
  deal: DealItem;
  onPressOpen?: (deal: DealItem) => void;
  onToggleFavorite?: (deal: DealItem, currentFavorite?: boolean) => void;
}

export default function DealCard({
  deal,
  onPressOpen,
  onToggleFavorite,
}: DealCardProps) {
  const { t } = useTranslation();
  const isFavorite = Boolean(deal.isFavorite);

  const handleFavoriteToggle = () => {
    onToggleFavorite?.(deal, isFavorite);
  };

  const imageSource =
    typeof deal.image === "string"
      ? { uri: deal.image }
      : deal.image || require("../../assets/images/placeholder-deal.jpg");

  return (
    <View
      style={{
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
        maxWidth: 580,
        width: "100%",
        alignSelf: "center",
      }}
      className="bg-white rounded-[26px] p-4 mb-5 border border-slate-200"
    >
      {/* Banner Container */}
      <View className="rounded-2xl overflow-hidden bg-neutral-100 relative">
        {/* Favorite Heart Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFavoriteToggle}
          className="absolute top-3 right-3 w-10 h-10 rounded-2xl bg-white items-center justify-center z-20 border border-neutral-100"
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={20}
            color={isFavorite ? "#ef4444" : "#1e293b"}
          />
        </TouchableOpacity>

        {/* Distance Badge */}
        {deal.distance ? (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              zIndex: 20,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Ionicons name="navigate-sharp" size={12} color="#ea580c" />
            <Text
              style={{
                color: "#ffffff",
                fontSize: 12,
                fontWeight: "700",
                marginLeft: 4,
              }}
            >
              {deal.distance}
            </Text>
          </View>
        ) : null}

        {/* Poster Image */}
        <Image
          source={imageSource}
          className="w-full"
          style={{ width: "100%", height: 260 }}
          contentFit="cover"
        />
      </View>

      {/* Card Info Details */}
      <View className="pt-3.5 pb-1 px-1">
        {deal.merchantName ? (
          <Text
            style={{
              color: "#ea580c",
              fontSize: 12,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {deal.merchantName}
          </Text>
        ) : null}
        <Text className="text-neutral-900 font-bold text-lg">
          {deal.dealHeading}
        </Text>
        <Text className="text-neutral-500 text-base mt-0.5 font-normal">
          {deal.dealDescription}
        </Text>
      </View>

      {/* Action CTA Button */}
      <PrimaryButton
        title={t("common.open", "Open")}
        onPress={() => onPressOpen?.(deal)}
        className="mt-3.5"
      />
    </View>
  );
}
