import React, { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useResponsive } from "../utils/useResponsive";

interface ResponsiveContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  maxWidth?: number;
  edges?: Edge[];
  backgroundColor?: string;
}

export function ResponsiveContainer({
  children,
  style,
  contentStyle,
  maxWidth = 720,
  edges = ["top", "left", "right", "bottom"],
  backgroundColor = "#ffffff",
}: ResponsiveContainerProps) {
  const { isTablet } = useResponsive();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, { backgroundColor }, style]}
    >
      <View style={[styles.outer, isTablet && styles.outerTablet]}>
        <View
          style={[
            styles.inner,
            isTablet && { maxWidth, alignSelf: "center" },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  outer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  outerTablet: {
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
