import { DimensionValue, useWindowDimensions } from "react-native";

export const BREAKPOINTS = {
  mobile: 0,
  tabletOrWide: 640,  // Large phones, foldables, iPads, and tablets
  desktop: 1024,      // Large iPad Pro landscape / large screens
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isWide = width >= BREAKPOINTS.tabletOrWide;
  const isLargeScreen = width >= BREAKPOINTS.desktop;

  // Fluid columns: 1 column on phones (<640px), 2 columns on tablets/foldables (>=640px), 3 columns on ultra-wide screens (>=1024px)
  const numColumns = isLargeScreen ? 3 : isWide ? 2 : 1;

  // Percentage width per item in a flexWrap grid typed as DimensionValue
  const itemWidthPercent: DimensionValue =
    numColumns === 3 ? "31.8%" : numColumns === 2 ? "48.5%" : "100%";

  // Proportional fluid scale for fonts, icons, or badges
  const scale = (size: number, factor = 1.15): number => {
    return isWide ? Math.round(size * factor) : size;
  };

  return {
    width,
    height,
    isLandscape,
    isWide,
    isLargeScreen,
    numColumns,
    itemWidthPercent,
    scale,
  };
}
