import { useWindowDimensions } from "react-native";

export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isTablet = width >= BREAKPOINTS.tablet || (isLandscape && height >= BREAKPOINTS.tablet);

  // Content max-width constrained for tablets to avoid excessive stretching
  const contentMaxWidth = isTablet ? 720 : "100%";

  // Responsive scale helper for paddings, fonts, or icons
  const scale = (size: number, tabletFactor = 1.2): number => {
    return isTablet ? Math.round(size * tabletFactor) : size;
  };

  return {
    width,
    height,
    isTablet,
    isLandscape,
    contentMaxWidth,
    scale,
  };
}
