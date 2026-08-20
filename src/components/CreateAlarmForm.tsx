import { Lucide } from "@react-native-vector-icons/lucide";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { FormSlider } from "./FormSlider";
import { RadioButton } from "./RadioButton";
import { TimeWheelPicker } from "./TimeWheelPicker";
import { WeekdayTextButton } from "./WeekdayTextButton";
import { taskDifficulties, taskTypes, weekdays } from "@/data/constants";
import type { Difficulty, TaskType } from "@/data/types";
import type { UseCreateAlarmFormResult } from "@/hooks/useCreateAlarmForm";
import { colors, radii, spacing, typography } from "@/theme";
import { formatTime } from "@/utils/time";

interface CreateAlarmFormProps {
  title: string;
  form: UseCreateAlarmFormResult;
}

export function CreateAlarmForm({ title, form }: CreateAlarmFormProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint="Returns to home screen"
          accessibilityState={{ disabled: form.saving }}
          disabled={form.saving}
          onPress={form.handleCancel}
        >
          <Lucide name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.iconPlaceholder} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={styles.card}
          accessibilityLabel={`Time selector: ${formatTime(form.hourSelected, form.minuteSelected)}`}
        >
          <Text style={styles.sectionLabel}>Time</Text>
          <TimeWheelPicker
            hour24={form.hourSelected}
            minute={form.minuteSelected}
            disabled={form.saving}
            onChange={(n) => {
              form.setHour(n.hour24);
              form.setMinute(n.minute);
            }}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Days</Text>
            <Pressable
              style={({ pressed }) => [
                styles.selectButton,
                pressed && !form.saving && styles.selectButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                form.weekdaysSelected.length === 7
                  ? "All days selected"
                  : "Select all days"
              }
              accessibilityHint="Selects all seven days of the week"
              accessibilityState={{ disabled: form.saving }}
              disabled={form.saving}
              onPress={form.selectAllDays}
            >
              <Text style={styles.selectButtonText}>Every day</Text>
            </Pressable>
          </View>
          <View style={styles.weekdaysRow}>
            {weekdays.map((day) => (
              <WeekdayTextButton
                key={day}
                weekday={day}
                selected={form.weekdaysSelected.includes(day)}
                disabled={form.saving}
                onToggle={form.toggleWeekday}
              />
            ))}
          </View>
          <Text style={styles.helperText}>
            {form.weekdaysSelected.length === 0 ? "Every day" : "Selected days"}
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.dropdownHeader,
              pressed && !form.saving && styles.dropdownHeaderPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Task type: ${form.taskSelected}`}
            accessibilityHint="Opens task type selection"
            accessibilityState={{
              disabled: form.saving,
              expanded: form.taskSelectorExpanded,
            }}
            disabled={form.saving}
            onPress={() => form.expandTaskSelector(!form.taskSelectorExpanded)}
          >
            <Text style={styles.sectionLabel}>Task</Text>
            <View style={styles.dropdownValue}>
              <Text style={styles.dropdownValueText}>{form.taskSelected}</Text>
              <Lucide
                name={form.taskSelectorExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </View>
          </Pressable>
          {form.taskSelectorExpanded ? (
            <View style={styles.dropdownList}>
              {taskTypes.map((task: TaskType) => (
                <Pressable
                  key={task}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    pressed && !form.saving && styles.dropdownItemPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${task} task ${task === form.taskSelected ? "selected" : "not selected"}`}
                  accessibilityState={{ disabled: form.saving }}
                  disabled={form.saving}
                  onPress={() => form.setTask(task)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      task === form.taskSelected &&
                        styles.dropdownItemTextActive,
                    ]}
                  >
                    {task}
                  </Text>
                  {task === form.taskSelected ? (
                    <Lucide name="check" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View
          style={[styles.card, !form.taskConfigurable && styles.cardDisabled]}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Rounds</Text>
            <Text
              style={styles.valueText}
              accessibilityLabel={`${form.roundsSelected} rounds selected`}
            >
              {form.roundsSelected}
            </Text>
          </View>
          <FormSlider
            min={1}
            max={5}
            step={1}
            value={form.roundsSelected}
            onChange={form.setRounds}
            disabled={!form.taskConfigurable || form.saving}
          />
        </View>

        <View
          style={[styles.card, !form.taskConfigurable && styles.cardDisabled]}
        >
          <Text style={styles.sectionLabel}>Difficulty</Text>
          <View
            style={styles.radiosRow}
            accessibilityLabel="Difficulty selection"
          >
            {taskDifficulties.map((d: Difficulty) => (
              <RadioButton
                key={d}
                label={d}
                selected={form.difficultySelected === d}
                disabled={!form.taskConfigurable || form.saving}
                onSelect={() => form.setDifficulty(d)}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Sound</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.selectButton,
                  pressed && !form.saving && styles.selectButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Select sound"
                accessibilityHint="Opens file picker to choose alarm sound"
                accessibilityState={{ disabled: form.saving }}
                disabled={form.saving}
                onPress={form.pickSound}
              >
                <Text style={styles.selectButtonText}>Select</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.selectButton,
                  form.alarmSoundUri == null && styles.selectButtonDisabled,
                  pressed && !form.saving && styles.selectButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Set to default sound"
                accessibilityHint="Resets sound to default alarm tone"
                accessibilityState={{
                  disabled: form.alarmSoundUri == null || form.saving,
                }}
                disabled={form.alarmSoundUri == null || form.saving}
                onPress={form.setToDefault}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    form.alarmSoundUri == null &&
                      styles.selectButtonTextDisabled,
                  ]}
                >
                  Set to default
                </Text>
              </Pressable>
            </View>
          </View>
          <Text
            style={styles.helperText}
            accessibilityLabel={`Current sound: ${form.alarmSoundSelected}`}
          >
            {form.alarmSoundSelected}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Snooze</Text>
            <Switch
              value={form.snoozeEnabled}
              onValueChange={form.toggleSnooze}
              disabled={form.saving}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={
                Platform.OS === "android"
                  ? form.snoozeEnabled
                    ? colors.primaryFg
                    : colors.textMuted
                  : undefined
              }
              ios_backgroundColor={colors.border}
              accessibilityLabel={`Snooze ${form.snoozeEnabled ? "enabled" : "disabled"}`}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerButtonSecondary,
            pressed && !form.saving && styles.footerButtonPressed,
            form.saving && styles.footerButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityHint="Discards changes and returns to home"
          accessibilityState={{ disabled: form.saving }}
          disabled={form.saving}
          onPress={form.handleCancel}
        >
          <Text style={styles.footerButtonTextSecondary}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerButtonPrimary,
            pressed && !form.saving && styles.footerButtonPressed,
            form.saving && styles.footerButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityHint="Saves and schedules the alarm"
          accessibilityState={{ disabled: form.saving }}
          disabled={form.saving}
          onPress={form.handleConfirm}
        >
          {form.saving ? (
            <ActivityIndicator color={colors.primaryFg} />
          ) : (
            <Text style={styles.footerButtonTextPrimary}>Confirm</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  weekdaysRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueText: {
    ...typography.bodyEmphasis,
    color: colors.text,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownHeaderPressed: {
    opacity: 0.7,
  },
  dropdownValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dropdownValueText: {
    ...typography.bodyEmphasis,
    color: colors.text,
  },
  dropdownList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  dropdownItemPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.text,
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  radiosRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  selectButtonPressed: {
    backgroundColor: colors.border,
  },
  selectButtonDisabled: {
    opacity: 0.5,
  },
  selectButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  selectButtonTextDisabled: {
    color: colors.textMuted,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  footerButtonPrimary: {
    backgroundColor: colors.primary,
  },
  footerButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  footerButtonPressed: {
    opacity: 0.8,
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  footerButtonTextPrimary: {
    ...typography.bodyEmphasis,
    color: colors.primaryFg,
  },
  footerButtonTextSecondary: {
    ...typography.bodyEmphasis,
    color: colors.text,
  },
});
