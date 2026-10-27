import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets: any;
}

function CustomBottomTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: CustomTabBarProps) {
  const safeBottom = Math.max(insets.bottom, Platform.OS === "android" ? 6 : 0);
  const barHeight = 64 + safeBottom;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          width: "100%",
          maxWidth: 640,
          height: barHeight,
          paddingBottom: safeBottom,
          backgroundColor: "#ffffff",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 1,
          borderTopColor: "#f1f5f9",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          elevation: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title || route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={onPress}
              style={{
                flex: 1,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? "#ea580c" : "#94a3b8",
                size: 24,
              })}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: isFocused ? "#ea580c" : "#94a3b8",
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: t("tabs.nearby"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "navigate-circle" : "navigate-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t("tabs.saved"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
