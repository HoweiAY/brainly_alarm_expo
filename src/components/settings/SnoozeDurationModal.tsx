import { SNOOZE_MINUTES_MAX, SNOOZE_MINUTES_MIN } from "@/data/constants";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { parseSnoozeMinutes } from "@/settings/userSettings";
import { colors, radii, spacing, typography } from "@/theme";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface SnoozeDurationModalProps {
  visible: boolean;
  initialMinutes: number;
  onConfirm: (minutes: number) => void;
  onCancel: () => void;
}

export function SnoozeDurationModal({
  visible,
  initialMinutes,
  onConfirm,
  onCancel,
}: SnoozeDurationModalProps) {
  const { t } = useAppTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel={t("settings.dismissDialog")}
        onPress={onCancel}
      />
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        {visible ? (
          <SnoozeDurationDialog
            initialMinutes={initialMinutes}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

type SnoozeDurationDialogProps = Omit<SnoozeDurationModalProps, "visible">;

function SnoozeDurationDialog({
  initialMinutes,
  onConfirm,
  onCancel,
}: SnoozeDurationDialogProps) {
  const { t } = useAppTranslation();
  const [text, setText] = useState(String(initialMinutes));
  const valid = parseSnoozeMinutes(text) !== null;
  const showError = text.trim().length > 0 && !valid;

  const submit = () => {
    const minutes = parseSnoozeMinutes(text);
    if (minutes === null) return;
    onConfirm(minutes);
  };

  return (
    <View style={styles.dialog} accessibilityViewIsModal>
      <Text style={styles.title} accessibilityRole="header">
        {t("settings.snoozeDuration")}
      </Text>
      <Text style={styles.subtitle}>{t("settings.snoozeDialogSubtitle")}</Text>
      <View style={[styles.inputRow, showError && styles.inputRowError]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          keyboardType="number-pad"
          maxLength={2}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          accessibilityLabel={t("settings.snoozeInputLabel")}
          accessibilityHint={t("settings.snoozeInputHint", {
            min: SNOOZE_MINUTES_MIN,
            max: SNOOZE_MINUTES_MAX,
          })}
        />
        <Text style={styles.unit}>{t("settings.minuteAbbreviation")}</Text>
      </View>
      <Text
        style={[styles.hint, showError && styles.hintError]}
        accessibilityLiveRegion="polite"
      >
        {showError
          ? t("settings.snoozeRangeError", {
              min: SNOOZE_MINUTES_MIN,
              max: SNOOZE_MINUTES_MAX,
            })
          : t("settings.snoozeRange", {
              min: SNOOZE_MINUTES_MIN,
              max: SNOOZE_MINUTES_MAX,
            })}
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonSecondary,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.cancel")}
          accessibilityHint={t("settings.cancelSnoozeHint")}
          onPress={onCancel}
        >
          <Text style={styles.buttonTextSecondary}>
            {t("common.actions.cancel")}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonPrimary,
            !valid && styles.buttonDisabled,
            pressed && valid && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.confirm")}
          accessibilityHint={t("settings.confirmSnoozeHint")}
          accessibilityState={{ disabled: !valid }}
          disabled={!valid}
          onPress={submit}
        >
          <Text style={styles.buttonTextPrimary}>
            {t("common.actions.confirm")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backdrop,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    ...typography.numeric,
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.sm,
    textAlign: "center",
  },
  unit: {
    ...typography.bodyEmphasis,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: "center",
  },
  hintError: {
    color: colors.danger,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonTextPrimary: {
    ...typography.bodyEmphasis,
    color: colors.primaryFg,
  },
  buttonTextSecondary: {
    ...typography.bodyEmphasis,
    color: colors.text,
  },
});
