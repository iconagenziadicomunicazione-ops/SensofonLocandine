// Sensofon Locandine — design tokens (from design_guidelines.json)

export const colors = {
  surface: "#FFFFFF",
  onSurface: "#111111",
  surfaceSecondary: "#F5F5F7",
  onSurfaceSecondary: "#3A3A3C",
  surfaceTertiary: "#E5E5EA",
  onSurfaceTertiary: "#8E8E93",
  surfaceInverse: "#1C1C1E",
  onSurfaceInverse: "#FFFFFF",

  brand: "#C8003C",
  onBrand: "#FFFFFF",
  brandDark: "#550216",
  brandTint: "#FDE8EC",

  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",

  border: "#E5E5EA",
  borderStrong: "#C6C6C8",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

// Font di sistema per evitare dipendenze da file font esterni nel deploy web.
export const fonts = {
  light: "system-ui",
  regular: "system-ui",
  medium: "system-ui",
  semibold: "system-ui",
  bold: "system-ui",
  extrabold: "system-ui",
};

export type OverlayWeight = "light" | "regular" | "medium" | "semibold" | "bold" | "extrabold";

export function fontFor(weight: OverlayWeight = "regular") {
  return fonts[weight];
}
