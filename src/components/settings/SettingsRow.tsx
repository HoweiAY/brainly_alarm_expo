import { colors, radii, spacing, typography } from "@/theme";
import { Lucide } from "@react-native-vector-icons/lucide";
import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

interface SettingsRowProps {
  label: string;
  description?: string;
  helperText?: string;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children?: ReactNode;
}

export function SettingsRow({
  label,
  description,
  helperText,
  disabled = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  children,
}: SettingsRowProps) {
  const content = (
    <>
      <View style={styles.textColumn}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>
      {children ? <View style={styles.accessory}>{children}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          disabled && styles.rowDisabled,
          pressed && !disabled && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.row, disabled && styles.rowDisabled]}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {content}
    </View>
  );
}

interface SettingsValueProps {
  value: string;
  showChevron?: boolean;
}

export function SettingsValue({
  value,
  showChevron = false,
}: SettingsValueProps) {
  return (
    <View style={styles.value}>
      <Text style={styles.valueText}>{value}</Text>
      {showChevron ? (
        <Lucide name="chevron-right" size={18} color={colors.textMuted} />
      ) : null}
    </View>
  );
}

interface SettingsSwitchProps {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export function SettingsSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: SettingsSwitchProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
      thumbColor={
        Platform.OS === "android"
          ? value
            ? colors.primaryFg
            : colors.textMuted
          : undefined
      }
      ios_backgroundColor={colors.border}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  rowPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...typography.bodyEmphasis,
    color: colors.text,
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
  },
  helper: {
    ...typography.caption,
    color: colors.textSubtle,
    fontStyle: "italic",
  },
  accessory: {
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  value: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  valueText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
