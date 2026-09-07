import { useTaskAutoDismiss } from "@/hooks/useTaskAutoDismiss";
import { useSettingsStore } from "@/store/settingsStore";
import { colors, radii, spacing, typography } from "@/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TaskHeaderProps {
  title: string;
  onAutoDismiss: () => void | Promise<void>;
  autoDismissEnabled?: boolean;
}

export function TaskHeader({
  title,
  onAutoDismiss,
  autoDismissEnabled,
}: TaskHeaderProps) {
  const globalAutoDismissEnabled = useSettingsStore(
    (s) => s.settings.autoDismissEnabled,
  );
  const { countdownVisible, remainingSeconds, skip } = useTaskAutoDismiss({
    config: { enabled: autoDismissEnabled ?? globalAutoDismissEnabled },
    onTimeout: onAutoDismiss,
  });
  const countdownText = `Auto dismiss in ${remainingSeconds} ${remainingSeconds === 1 ? "second" : "seconds"}`;

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {countdownVisible ? (
        <View style={styles.timeout}>
          <Text
            style={styles.countdown}
            accessibilityLiveRegion="polite"
            accessibilityLabel={countdownText}
          >
            {countdownText}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.skip,
              pressed && styles.skipPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Skip auto dismiss"
            accessibilityHint="Delays the auto-dismiss countdown by one minute"
            hitSlop={spacing.sm}
            onPress={skip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 57,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.caption,
    flexShrink: 0,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  timeout: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  countdown: {
    ...typography.caption,
    flexShrink: 1,
    color: colors.textMuted,
    textAlign: "right",
  },
  skip: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
  },
  skipPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  skipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
});
