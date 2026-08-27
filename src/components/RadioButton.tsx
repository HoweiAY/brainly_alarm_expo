import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/theme";

interface RadioButtonProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function RadioButton({
  label,
  selected,
  disabled = false,
  onSelect,
}: RadioButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.rowPressed,
      ]}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
    >
      <View
        style={[
          styles.circle,
          selected && styles.circleSelected,
          disabled && styles.circleDisabled,
        ]}
      >
        {selected ? (
          <View style={[styles.dot, disabled && styles.dotDisabled]} />
        ) : null}
      </View>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowPressed: {
    opacity: 0.7,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  circleSelected: {
    borderColor: colors.primary,
  },
  circleDisabled: {
    borderColor: colors.textSubtle,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  dotDisabled: {
    backgroundColor: colors.textSubtle,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  labelDisabled: {
    color: colors.textSubtle,
  },
});
