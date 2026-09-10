import { taskDifficulties, taskTypes, weekdays } from "@/data/constants";
import type { Difficulty, TaskType } from "@/data/types";
import type { UseCreateAlarmFormResult } from "@/hooks/useCreateAlarmForm";
import { translateDifficulty, translateTask } from "@/i18n/helpers";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { createThemedStyles, radii, spacing, typography } from "@/theme";
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

interface CreateAlarmFormProps {
  title: string;
  form: UseCreateAlarmFormResult;
}

export function CreateAlarmForm({ title, form }: CreateAlarmFormProps) {
  const { t } = useAppTranslation();
  const { colors, styles } = useStyles();
  const selectedTaskLabel = translateTask(t, form.taskSelected);
  const defaultSoundSelected =
    form.alarmSoundUri == null || form.alarmSoundUri === "";
  const soundLabel = defaultSoundSelected
    ? t("common.defaultSound")
    : form.alarmSoundSelected;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.back")}
          accessibilityHint={t("editor.backHint")}
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
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t("editor.time")}</Text>
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
            <Text style={styles.sectionLabel}>{t("editor.days")}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.selectButton,
                pressed && !form.saving && styles.selectButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                form.weekdaysSelected.length === 7
                  ? t("editor.allDaysSelected")
                  : t("editor.selectAllDays")
              }
              accessibilityHint={t("editor.selectAllDaysHint")}
              accessibilityState={{ disabled: form.saving }}
              disabled={form.saving}
              onPress={form.selectAllDays}
            >
              <Text style={styles.selectButtonText}>
                {t("common.everyDay")}
              </Text>
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
            {form.weekdaysSelected.length === 0
              ? t("common.everyDay")
              : t("editor.selectedDays")}
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.dropdownHeader,
              pressed && !form.saving && styles.dropdownHeaderPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("editor.taskTypeLabel", {
              task: selectedTaskLabel,
            })}
            accessibilityHint={t("editor.taskTypeHint")}
            accessibilityState={{
              disabled: form.saving,
              expanded: form.taskSelectorExpanded,
            }}
            disabled={form.saving}
            onPress={() => form.expandTaskSelector(!form.taskSelectorExpanded)}
          >
            <Text style={styles.sectionLabel}>{t("editor.task")}</Text>
            <View style={styles.dropdownValue}>
              <Text style={styles.dropdownValueText}>{selectedTaskLabel}</Text>
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
                  accessibilityLabel={t("editor.taskOptionLabel", {
                    task: translateTask(t, task),
                  })}
                  accessibilityState={{
                    selected: task === form.taskSelected,
                    disabled: form.saving,
                  }}
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
                    {translateTask(t, task)}
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
            <Text style={styles.sectionLabel}>{t("editor.rounds")}</Text>
            <Text
              style={styles.valueText}
              accessibilityLabel={t("editor.roundsSelected", {
                count: form.roundsSelected,
              })}
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
          <Text style={styles.sectionLabel}>{t("editor.difficulty")}</Text>
          <View style={styles.radiosRow}>
            {taskDifficulties.map((d: Difficulty) => (
              <RadioButton
                key={d}
                label={translateDifficulty(t, d)}
                selected={form.difficultySelected === d}
                disabled={!form.taskConfigurable || form.saving}
                onSelect={() => form.setDifficulty(d)}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>{t("editor.sound")}</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.selectButton,
                  pressed && !form.saving && styles.selectButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("editor.selectSound")}
                accessibilityHint={t("editor.selectSoundHint")}
                accessibilityState={{ disabled: form.saving }}
                disabled={form.saving}
                onPress={form.pickSound}
              >
                <Text style={styles.selectButtonText}>
                  {t("common.actions.select")}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.selectButton,
                  defaultSoundSelected && styles.selectButtonDisabled,
                  pressed && !form.saving && styles.selectButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("editor.setDefaultLabel")}
                accessibilityHint={t("editor.setDefaultHint")}
                accessibilityState={{
                  disabled: defaultSoundSelected || form.saving,
                }}
                disabled={defaultSoundSelected || form.saving}
                onPress={form.setToDefault}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    defaultSoundSelected && styles.selectButtonTextDisabled,
                  ]}
                >
                  {t("editor.setDefault")}
                </Text>
              </Pressable>
            </View>
          </View>
          <Text
            style={styles.helperText}
            accessibilityLabel={t("editor.currentSound", {
              sound: soundLabel,
            })}
          >
            {soundLabel}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>{t("editor.snooze")}</Text>
            <Switch
              value={form.snoozeEnabled}
              onValueChange={form.toggleSnooze}
              disabled={form.saving}
              trackColor={{ false: colors.switchTrack, true: colors.primary }}
              thumbColor={
                Platform.OS === "android"
                  ? form.snoozeEnabled
                    ? colors.primaryFg
                    : colors.textMuted
                  : undefined
              }
              ios_backgroundColor={colors.border}
              accessibilityLabel={t("editor.snoozeState", {
                state: t(
                  form.snoozeEnabled
                    ? "common.states.enabled"
                    : "common.states.disabled",
                ),
              })}
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
          accessibilityLabel={t("common.actions.cancel")}
          accessibilityHint={t("editor.cancelHint")}
          accessibilityState={{ disabled: form.saving }}
          disabled={form.saving}
          onPress={form.handleCancel}
        >
          <Text style={styles.footerButtonTextSecondary}>
            {t("common.actions.cancel")}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.footerButton,
            styles.footerButtonPrimary,
            pressed && !form.saving && styles.footerButtonPressed,
            form.saving && styles.footerButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.confirm")}
          accessibilityHint={t("editor.confirmHint")}
          accessibilityState={{ disabled: form.saving }}
          disabled={form.saving}
          onPress={form.handleConfirm}
        >
          {form.saving ? (
            <ActivityIndicator color={colors.primaryFg} />
          ) : (
            <Text style={styles.footerButtonTextPrimary}>
              {t("common.actions.confirm")}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
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
}));
