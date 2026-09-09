import type { Weekday } from "@/data/types";
import { translateWeekday } from "@/i18n/helpers";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { colors, radii, spacing, typography } from "@/theme";
import { Pressable, StyleSheet, Text } from "react-native";

interface WeekdayTextButtonProps {
  weekday: Weekday;
  selected: boolean;
  onToggle: (weekday: Weekday) => void;
  disabled?: boolean;
}

export function WeekdayTextButton({
  weekday,
  selected,
  onToggle,
  disabled = false,
}: WeekdayTextButtonProps) {
  const { t } = useAppTranslation();
  const weekdayLabel = translateWeekday(t, weekday);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pill,
        selected && styles.pillSelected,
        pressed && !disabled && styles.pillPressed,
        disabled && styles.pillDisabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={t("editor.weekdayState", {
        weekday: weekdayLabel,
        state: t(
          selected ? "common.states.selected" : "common.states.notSelected",
        ),
      })}
      disabled={disabled}
      onPress={() => onToggle(weekday)}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {weekdayLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  pillDisabled: {
    opacity: 0.4,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },
  labelSelected: {
    color: colors.primaryFg,
  },
});
