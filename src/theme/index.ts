import { colors } from "./colors";
import { radii } from "./radii";
import { spacing } from "./spacing";
import { typography } from "./typography";

export { colors, radii, spacing, typography };

export function useTheme() {
  return { colors, radii, spacing, typography };
}

export type Theme = ReturnType<typeof useTheme>;
