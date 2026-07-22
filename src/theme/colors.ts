export const colors = {
  background: "#0A0A0A",
  surface: "#171717",
  surfaceElevated: "#1F1F1F",
  border: "#262626",
  borderStrong: "#2E2E2E",
  text: "#FAFAFA",
  textMuted: "#A1A1AA",
  textSubtle: "#71717A",
  primary: "#EF4444",
  primaryHover: "#DC2626",
  primaryPressed: "#B91C1C",
  primaryFg: "#FFFFFF",
  success: "#22C55E",
  danger: "#EF4444",
  accent: "#3B82F6",
  backdrop: "rgba(0,0,0,0.6)",
  shadow: "rgba(0,0,0,0.4)",
} as const;

export type Colors = typeof colors;
