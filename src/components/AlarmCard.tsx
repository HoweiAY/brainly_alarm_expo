import { Lucide } from "@react-native-vector-icons/lucide";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { Alarm } from "@/data/types";
import { colors, radii, spacing, typography } from "@/theme";
import { formatTime, getDaysString } from "@/utils/time";

interface AlarmCardProps {
  alarm: Alarm;
  editEnabled: boolean;
  selected: boolean;
  onToggleEnabled: (alarm: Alarm) => void;
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
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(alarm)}
      onLongPress={() => onLongPress(alarm)}
    >
      <View style={styles.left}>
        <Text style={styles.time}>{formatTime(alarm.hour, alarm.minute)}</Text>
        <Text style={styles.days}>{getDaysString(alarm.days)}</Text>
      </View>
      {editEnabled ? (
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected ? (
            <Lucide name="check" color={colors.primaryFg} size={16} />
          ) : null}
        </View>
      ) : (
        <Switch
          value={alarm.enabled}
          onValueChange={() => onToggleEnabled(alarm)}
          trackColor={{ false: colors.surface, true: colors.primary }}
          thumbColor={
            Platform.OS === "android"
              ? alarm.enabled
                ? colors.primaryFg
                : colors.textMuted
              : undefined
          }
          ios_backgroundColor={colors.border}
        />
      )}
    </Pressable>
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
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  left: {
    flexDirection: "column",
    gap: spacing.xs,
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
