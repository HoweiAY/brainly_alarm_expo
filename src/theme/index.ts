import type { AppColorScheme } from "@/data/types";
import { useSettingsStore } from "@/store/settingsStore";
import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { colors, darkColors, lightColors, type Colors } from "./colors";
import { radii } from "./radii";
import { spacing } from "./spacing";
import { typography } from "./typography";

export { colors, darkColors, lightColors, radii, spacing, typography };
export type { Colors };

export interface Theme {
  colorScheme: AppColorScheme;
  colors: Colors;
  radii: typeof radii;
  spacing: typeof spacing;
  typography: typeof typography;
}

const themes: Record<AppColorScheme, Theme> = {
  dark: { colorScheme: "dark", colors: darkColors, radii, spacing, typography },
  light: {
    colorScheme: "light",
    colors: lightColors,
    radii,
    spacing,
    typography,
  },
};

export function useTheme(): Theme {
  const colorScheme = useSettingsStore((state) => state.settings.colorScheme);
  return themes[colorScheme];
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: Colors) => T,
) {
  return function useThemedStyles() {
    const theme = useTheme();
    const styles = useMemo(
      () => StyleSheet.create(factory(theme.colors)),
      [theme.colors],
    );
    return { ...theme, styles };
  };
}
