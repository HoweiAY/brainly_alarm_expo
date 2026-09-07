import {
  parseAlarmSnapshot,
  resetAlarm,
  snoozeAlarm,
} from "@/alarms/scheduling";
import { useAlarmDismissal } from "@/hooks/useAlarmDismissal";
import { useAlarmFiringStore } from "@/store/alarmFiringStore";
import { useAlarmStore } from "@/store/alarmStore";
import { useSettingsStore } from "@/store/settingsStore";
import { colors, radii, spacing, typography } from "@/theme";
import dayjs from "dayjs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AlarmDisplay() {
  const router = useRouter();
  const dismiss = useAlarmDismissal();
  const params = useLocalSearchParams();
  const snapshot = parseAlarmSnapshot(
    params as Record<string, string | string[] | undefined>,
  );

  const currentAlarm = useAlarmStore((s) =>
    snapshot ? s.alarms.find((a) => a.id === snapshot.alarmId) : undefined,
  );
  const snoozeMinutes = useSettingsStore((s) => s.settings.snoozeMinutes);
  const snoozeDurationText = `${snoozeMinutes} minute${snoozeMinutes === 1 ? "" : "s"}`;

  const effectiveSnapshot = useMemo(
    () =>
      snapshot?.isSnoozed && currentAlarm
        ? {
            ...snapshot,
            task: currentAlarm.task,
            difficulty: currentAlarm.difficulty,
            roundCount: currentAlarm.rounds,
            sound: currentAlarm.sound ?? "Default",
          }
        : snapshot,
    [snapshot, currentAlarm],
  );

  useEffect(() => {
    if (effectiveSnapshot && !useAlarmFiringStore.getState().activeSnapshot) {
      useAlarmFiringStore.getState().setActive(effectiveSnapshot);
    }
  }, [effectiveSnapshot]);

  useEffect(() => {
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      const active = useAlarmFiringStore.getState().activeSnapshot;
      if (active) return true;
      return false;
    });
    return () => backSub.remove();
  }, []);

  const [currentTime, setCurrentTime] = useState(() => dayjs().format("HH:mm"));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format("HH:mm"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!effectiveSnapshot) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.missing} accessibilityRole="header">
            No active alarm.
          </Text>
          <Pressable
            style={styles.button}
            accessibilityRole="button"
            accessibilityHint="Returns to home screen"
            onPress={() => void dismiss()}
          >
            <Text style={styles.buttonText}>Dismiss</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleBegin = () => {
    void resetAlarm(effectiveSnapshot);
    if (effectiveSnapshot.task === "None") {
      void dismiss();
      return;
    }
    const rounds = String(effectiveSnapshot.roundCount || 1);
    const difficulty = effectiveSnapshot.difficulty;
    if (effectiveSnapshot.task === "Shake phone") {
      router.push("/tasks/phone-shaking");
    } else if (effectiveSnapshot.task === "Memory") {
      router.push(`/tasks/memory-game/${rounds}/${difficulty}`);
    } else if (effectiveSnapshot.task === "Math") {
      router.push(`/tasks/math-equation/${rounds}/${difficulty}`);
    }
  };

  const handleOff = () => {
    void resetAlarm(effectiveSnapshot);
    void dismiss();
  };

  const handleSnooze = () => {
    void snoozeAlarm(effectiveSnapshot);
    useAlarmFiringStore.getState().clearActive();
    router.dismissTo("/(main)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text
          style={styles.time}
          accessibilityLabel={`Current time: ${currentTime}`}
        >
          {currentTime}
        </Text>
        <Text style={styles.label}>
          {effectiveSnapshot.isSnoozed ? "Snoozed alarm" : "Alarm"}
        </Text>
        <Text style={styles.task}>Task: {effectiveSnapshot.task}</Text>
      </View>
      <View style={styles.actions}>
        {effectiveSnapshot.task === "None" ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Turn off"
            accessibilityHint="Stops the alarm immediately"
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
            accessibilityHint={`Starts the ${effectiveSnapshot.task} dismissal task`}
            onPress={handleBegin}
          >
            <Text style={styles.primaryButtonText}>Begin</Text>
          </Pressable>
        )}
        {effectiveSnapshot.snooze ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Snooze"
            accessibilityHint={`Snoozes the alarm for ${snoozeDurationText}`}
            onPress={handleSnooze}
          >
            <Text style={styles.buttonText}>Snooze ({snoozeMinutes} min)</Text>
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
