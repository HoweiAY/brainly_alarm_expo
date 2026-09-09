import { darkColors, lightColors } from "@/theme/colors";
import { describe, expect, it } from "@jest/globals";

const originalDarkColors = {
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
};

describe("theme palettes", () => {
  it("preserves the existing dark appearance", () => {
    expect(darkColors).toMatchObject(originalDarkColors);
  });

  it("keeps semantic tokens aligned across color schemes", () => {
    expect(Object.keys(lightColors).sort()).toEqual(
      Object.keys(darkColors).sort(),
    );
  });

  it("uses distinct light surfaces and dark text", () => {
    expect(lightColors.background).not.toBe(darkColors.background);
    expect(lightColors.surface).not.toBe(darkColors.surface);
    expect(lightColors.text).not.toBe(darkColors.text);
  });
});
