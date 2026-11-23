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
  isPinned?: boolean;
  distance?: string;
  merchantName?: string;
  merchantLogo?: string | null;
  areaName?: string;
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
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 4,
        width: "100%",
        alignSelf: "center",
        borderRadius: 14,
      }}
      className="bg-white p-3 mb-5 border border-slate-100"
    >
      {/* Banner Container */}
      <View
        style={{
          width: "100%",
          aspectRatio: 4 / 5,
          backgroundColor: "#000000",
          borderRadius: 10,
          overflow: "hidden",
        }}
        className="relative"
      >
        {/* 
          =======================================================================
          [COMMENTED OUT AS REQUESTED]
          Floating Business Logo, Name & Location overlay over image.
          You can uncomment this block anytime if you want the logo box & details 
          back directly on top of the image:
          =======================================================================
        */}
        {/*
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 25,
            flexDirection: "row",
            alignItems: "center",
            maxWidth: "75%",
          }}
        >
          <View
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 5,
              elevation: 4,
            }}
            className="w-11 h-11 rounded-2xl bg-white p-0.5 border-2 border-white items-center justify-center overflow-hidden flex-shrink-0 mr-2.5"
          >
            {deal.merchantLogo ? (
              <Image
                source={{ uri: deal.merchantLogo }}
                style={{ width: "100%", height: "100%", borderRadius: 10 }}
                contentFit="contain"
              />
            ) : (
              <View className="w-full h-full rounded-xl bg-orange-50 items-center justify-center border border-orange-100">
                <Text className="text-orange-600 font-black text-xs">
                  {deal.merchantName ? deal.merchantName.slice(0, 4).toUpperCase() : "CD"}
                </Text>
              </View>
            )}
          </View>

          {deal.merchantName || deal.areaName || deal.category ? (
            <View style={{ justifyContent: "center" }}>
              {deal.merchantName ? (
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: "800",
                    textShadowColor: "rgba(0, 0, 0, 0.85)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}
                  numberOfLines={1}
                >
                  {deal.merchantName}
                </Text>
              ) : null}
              <Text
                style={{
                  color: "#f1f5f9",
                  fontSize: 11,
                  fontWeight: "600",
                  marginTop: 1,
                  textShadowColor: "rgba(0, 0, 0, 0.85)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}
                numberOfLines={1}
              >
                {[deal.category, deal.areaName].filter(Boolean).join(" • ") || "Local Deal"}
              </Text>
            </View>
          ) : null}
        </View>
        */}

        {/* Favorite Heart Button (Top-Right over Image) */}
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

        {/* Location Distance Badge (Top-Right under Favorite Button like reference image) */}
        {deal.distance ? (
          <View
            style={{
              position: "absolute",
              top: 58,
              right: 12,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(15, 23, 42, 0.88)",
              paddingHorizontal: 10,
              paddingVertical: 4.5,
              borderRadius: 20,
              zIndex: 20,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.15)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Ionicons name="location-sharp" size={12} color="#ffffff" />
            <Text
              style={{
                color: "#ffffff",
                fontSize: 11.5,
                fontWeight: "700",
                marginLeft: 3.5,
              }}
            >
              {deal.distance}
            </Text>
          </View>
        ) : null}

        {/* Pinned Badge */}
        {/* {deal.isPinned ? (
          <View
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#d97706",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              zIndex: 20,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Ionicons name="pin" size={12} color="#ffffff" />
            <Text
              style={{
                color: "#ffffff",
                fontSize: 11,
                fontWeight: "800",
                marginLeft: 4,
                letterSpacing: 0.3,
              }}
            >
              PINNED
            </Text>
          </View>
        ) : null} */}

        {/* Poster Image */}
        <Image
          source={imageSource}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>

      {/* Card Info Details (Matching reference image typography 100%) */}
      <View className="pt-3.5 pb-1 px-1.5">
        {/* Merchant Name in uppercase subtle grey */}
        {deal.merchantName ? (
          <Text
            style={{
              color: "#64748b",
              fontSize: 13,
              fontWeight: "700",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {deal.merchantName}
          </Text>
        ) : null}

        {/* Deal Title / Heading in Bold Uppercase */}
        <Text
          style={{
            color: "#0f172a",
            fontSize: 20,
            fontWeight: "900",
            letterSpacing: -0.3,
            lineHeight: 25,
            textTransform: "uppercase",
            marginBottom: 3,
          }}
          numberOfLines={2}
        >
          {deal.dealHeading}
        </Text>

        {/* Deal Description */}
        {deal.dealDescription ? (
          <Text
            style={{
              color: "#475569",
              fontSize: 14,
              fontWeight: "400",
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
        style={{ borderRadius: 12 }}
        className="mt-3.5 py-3.5 bg-[#f97316] active:bg-[#ea580c]"
        textClassName="text-base font-bold tracking-normal text-white"
      />
    </View>
  );
}
