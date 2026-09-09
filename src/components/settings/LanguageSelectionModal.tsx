import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n/languages";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { colors, radii, spacing, typography } from "@/theme";
import { Lucide } from "@react-native-vector-icons/lucide";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface LanguageSelectionModalProps {
  visible: boolean;
  selected: AppLanguage;
  disabled?: boolean;
  onSelect: (language: AppLanguage) => void;
  onCancel: () => void;
}

export function LanguageSelectionModal({
  visible,
  selected,
  disabled = false,
  onSelect,
  onCancel,
}: LanguageSelectionModalProps) {
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
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {t("settings.languageDialogTitle")}
          </Text>
          <Text style={styles.subtitle}>
            {t("settings.languageDialogSubtitle")}
          </Text>
          <View style={styles.options}>
            {SUPPORTED_LANGUAGES.map(({ code, label }) => {
              const isSelected = code === selected;
              return (
                <Pressable
                  key={code}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && !disabled && styles.optionPressed,
                    disabled && styles.optionDisabled,
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={t("settings.languageOption", {
                    language: label,
                    state: t(
                      isSelected
                        ? "common.states.selected"
                        : "common.states.notSelected",
                    ),
                  })}
                  accessibilityState={{ selected: isSelected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelect(code)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                  {isSelected ? (
                    <Lucide name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            accessibilityRole="button"
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>{t("common.actions.cancel")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  options: {
    gap: spacing.xs,
  },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  optionPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  cancelButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  cancelButtonPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  cancelText: {
    ...typography.bodyEmphasis,
    color: colors.primary,
  },
});
