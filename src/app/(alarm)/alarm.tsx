import {
  parseAlarmSnapshot,
  resetAlarm,
  snoozeAlarm,
} from "@/alarms/scheduling";
import { useAlarmDismissal } from "@/hooks/useAlarmDismissal";
import { colors, radii, spacing, typography } from "@/theme";
import { formatTime } from "@/utils/time";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AlarmDisplay() {
  const router = useRouter();
  const dismiss = useAlarmDismissal();
  const params = useLocalSearchParams();
  const snapshot = parseAlarmSnapshot(
    params as Record<string, string | string[] | undefined>,
  );

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.missing}>No active alarm.</Text>
          <Pressable
            style={styles.button}
            accessibilityRole="button"
            onPress={() => void dismiss()}
          >
            <Text style={styles.buttonText}>Dismiss</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleBegin = () => {
    void resetAlarm(snapshot);
    if (snapshot.task === "None") {
      void dismiss();
      return;
    }
    const rounds = String(snapshot.roundCount || 1);
    const difficulty = snapshot.difficulty;
    if (snapshot.task === "Shake phone") {
      router.push("/tasks/phone-shaking");
    } else if (snapshot.task === "Memory") {
      router.push(`/tasks/memory-game/${rounds}/${difficulty}`);
    } else if (snapshot.task === "Math") {
      router.push(`/tasks/math-equation/${rounds}/${difficulty}`);
    }
  };

  const handleOff = () => {
    void resetAlarm(snapshot);
    void dismiss();
  };

  const handleSnooze = () => {
    void snoozeAlarm(snapshot);
    router.dismissTo("/(main)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.time}>
          {formatTime(snapshot.hour, snapshot.minute)}
        </Text>
        <Text style={styles.label}>
          {snapshot.isSnoozed ? "Snoozed alarm" : "Alarm"}
        </Text>
        <Text style={styles.task}>Task: {snapshot.task}</Text>
      </View>
      <View style={styles.actions}>
        {snapshot.task === "None" ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Turn off"
            onPress={handleOff}
          >
            <Text style={styles.primaryButtonText}>Turn Off</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Begin task"
            onPress={handleBegin}
          >
            <Text style={styles.primaryButtonText}>Begin</Text>
          </Pressable>
        )}
        {snapshot.snooze ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Snooze"
            onPress={handleSnooze}
          >
            <Text style={styles.buttonText}>Snooze</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  time: {
    ...typography.h1,
    fontSize: 48,
    lineHeight: 64,
    color: colors.primary,
  },
  label: {
    ...typography.body,
    color: colors.textMuted,
  },
  task: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  missing: {
    ...typography.h2,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    ...typography.bodyEmphasis,
    color: colors.text,
  },
  primaryButtonText: {
    ...typography.bodyEmphasis,
    color: colors.primaryFg,
  },
});
