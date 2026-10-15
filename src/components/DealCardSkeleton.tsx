import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

interface DealCardSkeletonProps {
  count?: number;
}

export default function DealCardSkeleton({ count = 2 }: DealCardSkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 4,
          }}
          className="bg-white rounded-[26px] p-4 mb-5 border border-slate-200"
        >
          {/* Poster Image Skeleton */}
          <Animated.View
            style={[
              {
                width: "100%",
                height: 350,
                opacity: pulseAnim,
              },
            ]}
            className="rounded-2xl bg-neutral-200 relative justify-between p-3.5"
          >
            {/* Fake category chip badge */}
            <View className="w-20 h-6 rounded-full bg-neutral-300/80" />

            {/* Fake favorite circular button */}
            <View className="absolute top-3.5 right-3.5 w-10 h-10 rounded-2xl bg-white/70" />
          </Animated.View>

          {/* Card Info Details Skeleton */}
          <View className="pt-4 pb-1 px-1">
            {/* Title Line */}
            <Animated.View
              style={{ opacity: pulseAnim }}
              className="h-5 bg-neutral-200 rounded-lg w-3/4 mb-2.5"
            />
            {/* Description Lines */}
            <Animated.View
              style={{ opacity: pulseAnim }}
              className="h-3.5 bg-neutral-100 rounded-md w-full mb-1.5"
            />
            <Animated.View
              style={{ opacity: pulseAnim }}
              className="h-3.5 bg-neutral-100 rounded-md w-2/3"
            />
          </View>

          {/* Action CTA Button Skeleton */}
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="h-12 bg-neutral-200 rounded-full w-full mt-4"
          />
        </View>
      ))}
    </>
  );
}
