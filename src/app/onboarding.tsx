import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import PrimaryButton from "../components/PrimaryButton";
import { ONBOARDING_DATA, OnboardingSlide } from "../config/constants";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { useTranslation } from "react-i18next";

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    if (index >= 0 && index < ONBOARDING_DATA.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      useAuthStore.getState().setOnboardingCompleted(true);
      router.replace("/(auth)/login" as any);
    }
  };

  const handleSkip = () => {
    useAuthStore.getState().setOnboardingCompleted(true);
    router.replace("/(auth)/login" as any);
  };

  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1;

  const getSlideContent = (item: OnboardingSlide) => {
    if (item.id === "1") {
      return {
        badge: t("onboarding.slide1_badge", item.badge),
        title: t("onboarding.slide1_title", item.title),
        desc: t("onboarding.slide1_desc", item.description),
      };
    }
    if (item.id === "2") {
      return {
        badge: t("onboarding.slide2_badge", item.badge),
        title: t("onboarding.slide2_title", item.title),
        desc: t("onboarding.slide2_desc", item.description),
      };
    }
    return {
      badge: t("onboarding.slide3_badge", item.badge),
      title: t("onboarding.slide3_title", item.title),
      desc: t("onboarding.slide3_desc", item.description),
    };
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 justify-between">
      <StatusBar style="dark" />

      {/* Top Header with CityDeals logo / Skip Button */}
      <View className="flex-row justify-between items-center px-6 pt-2 h-16">
        <Image
          source={require("../../assets/images/city-deals-logo.png")}
          className="h-10 w-36"
          resizeMode="contain"
        />

        {!isLastSlide ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSkip}
            className="px-4 py-2 rounded-full bg-neutral-100/90 active:bg-neutral-200"
          >
            <Text className="text-neutral-700 font-bold text-base">{t("onboarding.skip", "Skip")}</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {/* Swiper Content */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const content = getSlideContent(item);
          return (
            <View
              style={{ width }}
              className="flex-1 items-center justify-center px-6"
            >
              {/* Image Illustration with Soft Ambient Glow */}
              <View className="items-center justify-center relative my-4 w-full">
                <View className="absolute w-64 h-64 rounded-full bg-orange-100/60 blur-2xl" />
                <Image
                  source={item.image}
                  className="w-72 h-64"
                  resizeMode="contain"
                />
              </View>

              {/* Content Details */}
              <View className="items-center mt-6 max-w-md px-2">
                <View className="bg-orange-50 border border-orange-200/60 px-4 py-1.5 rounded-full mb-3.5">
                  <Text className="text-orange-600 text-base font-bold uppercase tracking-wider">
                    {content.badge}
                  </Text>
                </View>

                <Text className="text-2xl font-extrabold text-neutral-900 text-center tracking-tight leading-tight">
                  {content.title}
                </Text>

                <Text className="text-neutral-600 text-center text-base leading-6 mt-3 font-normal">
                  {content.desc}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Controls (Pagination Dots + Action Button) */}
      <View className="px-6 pb-6 pt-2">
        {/* Pagination Dots */}
        <View className="flex-row justify-center items-center gap-2 mb-6">
          {ONBOARDING_DATA.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() =>
                  flatListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                  })
                }
                className={`h-2.5 rounded-full ${
                  isActive ? "w-8 bg-orange-500" : "w-2.5 bg-neutral-300"
                }`}
              />
            );
          })}
        </View>

        {/* Primary CTA Button */}
        <PrimaryButton
          title={isLastSlide ? t("onboarding.get_started", "Get Started") : t("onboarding.next", "Next")}
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}
