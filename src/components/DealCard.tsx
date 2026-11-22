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
  actionTitle?: string;
  actionDisabled?: boolean;
  actionLoading?: boolean;
}

export default function DealCard({
  deal,
  onPressOpen,
  onToggleFavorite,
  actionTitle,
  actionDisabled = false,
  actionLoading = false,
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
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        width: "100%",
        alignSelf: "center",
      }}
      className="bg-white rounded-[28px] p-3 mb-5 border border-slate-100"
    >
      {/* Banner Container */}
      <View
        style={{
          width: "100%",
          aspectRatio: 4 / 5,
          backgroundColor: "#000000",
        }}
        className="rounded-[22px] overflow-hidden relative"
      >
        {/* Favorite Heart Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFavoriteToggle}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white items-center justify-center z-20 shadow-md"
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
              top: 54,
              right: 10,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(15, 23, 42, 0.88)",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              zIndex: 20,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.2)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="location-sharp" size={13} color="#ffffff" />
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
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>

      {/* Card Info Details */}
      <View className="pt-3.5 pb-1 px-1.5">
        {deal.merchantName ? (
          <Text
            style={{
              color: "#64748b",
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
        <Text
          style={{
            color: "#0f172a",
            fontSize: 19,
            fontWeight: "800",
            letterSpacing: -0.3,
            lineHeight: 24,
          }}
          numberOfLines={2}
        >
          {deal.dealHeading}
        </Text>
        {deal.dealDescription ? (
          <Text
            style={{
              color: "#64748b",
              fontSize: 14,
              fontWeight: "400",
              marginTop: 4,
              lineHeight: 20,
            }}
            numberOfLines={2}
          >
            {deal.dealDescription}
          </Text>
        ) : null}
      </View>

      {/* Action CTA Button */}
      <PrimaryButton
        title={actionTitle || t("common.open", "Open Deal")}
        onPress={() => onPressOpen?.(deal)}
        disabled={actionDisabled}
        loading={actionLoading}
        className="mt-3.5 rounded-full py-3.5 bg-[#f97316] active:bg-[#ea580c]"
        textClassName="text-base font-bold tracking-normal"
      />
    </View>
  );
}
