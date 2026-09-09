export const darkColors = {
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
  switchTrack: "#171717",
  backdrop: "rgba(0,0,0,0.6)",
  shadow: "rgba(0,0,0,0.4)",
} as const;

export type Colors = {
  readonly [Token in keyof typeof darkColors]: string;
};

export const lightColors: Colors = {
  background: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceElevated: "#F4F4F5",
  border: "#E4E4E7",
  borderStrong: "#D4D4D8",
  text: "#18181B",
  textMuted: "#52525B",
  textSubtle: "#71717A",
  primary: "#DC2626",
  primaryHover: "#B91C1C",
  primaryPressed: "#991B1B",
  primaryFg: "#FFFFFF",
  success: "#15803D",
  danger: "#DC2626",
  accent: "#2563EB",
  switchTrack: "#D4D4D8",
  backdrop: "rgba(0,0,0,0.35)",
  shadow: "rgba(0,0,0,0.18)",
};

export const colors = darkColors;
