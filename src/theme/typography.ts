import type { TextStyle } from "react-native";

const family = {
  regular: "Geist-Regular",
  medium: "Geist-Medium",
  semibold: "Geist-SemiBold",
  bold: "Geist-Bold",
} as const;

export const typography = {
  display: {
    fontFamily: family.bold,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
  },
  h1: {
    fontFamily: family.bold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  h2: {
    fontFamily: family.semibold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
  },
  h3: {
    fontFamily: family.semibold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  body: {
    fontFamily: family.regular,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  bodyEmphasis: {
    fontFamily: family.medium,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  caption: {
    fontFamily: family.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  numeric: {
    fontFamily: family.medium,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "500",
  },
  mono: {
    fontFamily: family.medium,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "500",
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
