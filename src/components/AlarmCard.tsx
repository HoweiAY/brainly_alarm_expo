import type { Alarm } from "@/data/types";
import { announce } from "@/hooks/useAccessibility";
import { translateTask } from "@/i18n/helpers";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { colors, radii, spacing, typography } from "@/theme";
import { formatTime, getDaysString } from "@/utils/time";
import { Lucide } from "@react-native-vector-icons/lucide";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const taskIcons = {
  Math: "sigma",
  Memory: "brain",
  "Shake phone": "vibrate",
  None: "alarm-clock",
} as const;

interface AlarmCardProps {
  alarm: Alarm;
  editEnabled: boolean;
  selected: boolean;
  onToggleEnabled: (alarm: Alarm) => Promise<boolean>;
  onPress: (alarm: Alarm) => void;
  onLongPress: (alarm: Alarm) => void;
}

export function AlarmCard({
  alarm,
  editEnabled,
  selected,
  onToggleEnabled,
  onPress,
  onLongPress,
}: AlarmCardProps) {
  const { t } = useAppTranslation();
  const time = formatTime(alarm.hour, alarm.minute);
  const days = getDaysString(alarm.days, t);
  const task = translateTask(t, alarm.task);

  const handleToggleEnabled = async () => {
    const nextEnabled = !alarm.enabled;
    const updated = await onToggleEnabled(alarm);
    if (updated) {
      announce(
        t("home.alarmAnnouncement", {
          time,
          days,
          state: t(
            nextEnabled ? "common.states.enabled" : "common.states.disabled",
          ),
        }),
      );
    }
  };

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [
          styles.cardBody,
          pressed && styles.cardBodyPressed,
        ]}
        onPress={() => onPress(alarm)}
        onLongPress={() => onLongPress(alarm)}
        accessibilityRole="button"
        accessibilityLabel={t("home.alarmCardLabel", { time, task, days })}
        accessibilityHint={
          editEnabled
            ? t("home.alarmSelectionHint", {
                action: t(
                  selected ? "home.deselectAction" : "home.selectAction",
                ),
              })
            : t("home.alarmEditHint")
        }
        accessibilityState={{ selected: editEnabled ? selected : undefined }}
      >
        <View style={styles.left}>
          <Text style={styles.time}>{time}</Text>
          <View style={styles.row}>
            <Lucide
              name={taskIcons[alarm.task]}
              size={14}
              color={colors.textMuted}
              importantForAccessibility="no"
            />
            <Text style={styles.days}>{days}</Text>
          </View>
        </View>
      </Pressable>
      {editEnabled ? (
        <Pressable
          style={[styles.checkbox, selected && styles.checkboxSelected]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          accessibilityLabel={t("home.alarmCheckboxLabel", { time })}
          onPress={() => onPress(alarm)}
        >
          {selected ? (
            <Lucide name="check" color={colors.primaryFg} size={16} />
          ) : null}
        </Pressable>
      ) : (
        <Switch
          value={alarm.enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{ false: colors.surface, true: colors.primary }}
          thumbColor={
            Platform.OS === "android"
              ? alarm.enabled
                ? colors.primaryFg
                : colors.textMuted
              : undefined
          }
          ios_backgroundColor={colors.border}
          accessibilityLabel={t("home.alarmToggleLabel", {
            time,
            days,
            state: t(
              alarm.enabled
                ? "common.states.enabled"
                : "common.states.disabled",
            ),
          })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  cardBodyPressed: {
    opacity: 0.7,
  },
  left: {
    flexDirection: "column",
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  time: {
    ...typography.numeric,
    color: colors.text,
  },
  days: {
    ...typography.caption,
    color: colors.textMuted,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
  },
});
