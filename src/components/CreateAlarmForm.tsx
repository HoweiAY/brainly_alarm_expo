import { Lucide } from "@react-native-vector-icons/lucide";
import {
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
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Time</Text>
          <TimeWheelPicker
            hour24={form.hourSelected}
            minute={form.minuteSelected}
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
                pressed && styles.selectButtonPressed,
              ]}
              accessibilityRole="button"
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
              pressed && styles.dropdownHeaderPressed,
            ]}
            accessibilityRole="button"
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
                    pressed && styles.dropdownItemPressed,
                  ]}
                  accessibilityRole="button"
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
            <Text style={styles.valueText}>{form.roundsSelected}</Text>
          </View>
          <FormSlider
            min={1}
            max={5}
            step={1}
            value={form.roundsSelected}
            onChange={form.setRounds}
            disabled={!form.taskConfigurable}
          />
        </View>

        <View
          style={[styles.card, !form.taskConfigurable && styles.cardDisabled]}
        >
          <Text style={styles.sectionLabel}>Difficulty</Text>
          <View style={styles.radiosRow}>
            {taskDifficulties.map((d: Difficulty) => (
              <RadioButton
                key={d}
                label={d}
                selected={form.difficultySelected === d}
                disabled={!form.taskConfigurable}
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
                  pressed && styles.selectButtonPressed,
                ]}
                accessibilityRole="button"
                onPress={form.pickSound}
              >
                <Text style={styles.selectButtonText}>Select</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.selectButton,
                  form.alarmSoundUri == null && styles.selectButtonDisabled,
                  pressed && styles.selectButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: form.alarmSoundUri == null }}
                disabled={form.alarmSoundUri == null}
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
          <Text style={styles.helperText}>{form.alarmSoundSelected}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Snooze</Text>
            <Switch
              value={form.snoozeEnabled}
              onValueChange={form.toggleSnooze}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={
                Platform.OS === "android"
                  ? form.snoozeEnabled
                    ? colors.primaryFg
                    : colors.textMuted
                  : undefined
              }
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerButtonSecondary,
            pressed && styles.footerButtonPressed,
          ]}
          accessibilityRole="button"
          onPress={form.handleCancel}
        >
          <Text style={styles.footerButtonTextSecondary}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerButtonPrimary,
            pressed && styles.footerButtonPressed,
          ]}
          accessibilityRole="button"
          onPress={form.handleConfirm}
        >
          <Text style={styles.footerButtonTextPrimary}>Confirm</Text>
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
  footerButtonTextPrimary: {
    ...typography.bodyEmphasis,
    color: colors.primaryFg,
  },
  footerButtonTextSecondary: {
    ...typography.bodyEmphasis,
    color: colors.text,
  },
});
