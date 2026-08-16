import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, spacing, typography } from "@/theme";
import type { Weekday } from "@/data/types";

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
      accessibilityLabel={`${weekday} ${selected ? "selected" : "not selected"}`}
      disabled={disabled}
      onPress={() => onToggle(weekday)}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {weekday}
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
