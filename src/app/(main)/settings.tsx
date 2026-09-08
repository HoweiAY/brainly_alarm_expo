import { reconcileSchedules } from "@/alarms/scheduling";
import { LanguageSelectionModal } from "@/components/settings/LanguageSelectionModal";
import {
  SettingsRow,
  SettingsSwitch,
  SettingsValue,
} from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SnoozeDurationModal } from "@/components/settings/SnoozeDurationModal";
import type { UserSettings } from "@/data/types";
import { useScreenReaderEnabled } from "@/hooks/useAccessibility";
import { i18n, type AppLanguage } from "@/i18n";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { syncAlarmNotificationChannel } from "@/notifications/AlarmNotifications";
import { useSettingsStore } from "@/store/settingsStore";
import { colors, radii, spacing, typography } from "@/theme";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useAppTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const loaded = useSettingsStore((s) => s.loaded);
  const screenReaderEnabled = useScreenReaderEnabled();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [languageUpdating, setLanguageUpdating] = useState(false);
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);

  const update = async (patch: Partial<UserSettings>) => {
    try {
      await useSettingsStore.getState().updateSettings(patch);
    } catch (e) {
      console.error("updateSettings failed", e);
      Alert.alert(t("common.error"), t("settings.saveError"));
    }
  };

  const selectLanguage = async (language: AppLanguage) => {
    if (language === settings.language) {
      setLanguageModalVisible(false);
      return;
    }
    const previousLanguage = settings.language;
    setLanguageUpdating(true);
    try {
      await i18n.changeLanguage(language);
      await useSettingsStore.getState().updateSettings({ language });
      setLanguageModalVisible(false);
      await syncAlarmNotificationChannel();
      await reconcileSchedules();
    } catch (e) {
      console.error("updateLanguage failed", e);
      await i18n.changeLanguage(previousLanguage);
      Alert.alert(t("common.error"), t("settings.saveError"));
    } finally {
      setLanguageUpdating(false);
    }
  };

  const languageLabel = t(
    settings.language === "en"
      ? "common.languages.en"
      : "common.languages.zhHant",
  );
  const snoozeLabel = t("settings.snoozeValue", {
    count: settings.snoozeMinutes,
  });
  const showTileNumbers =
    screenReaderEnabled === true || settings.showTileNumbers;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("common.actions.back")}
          accessibilityHint={t("settings.backHint")}
          onPress={() => router.back()}
        >
          <Lucide name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t("settings.title")}
        </Text>
        <View style={styles.iconPlaceholder} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsSection title={t("settings.general")}>
          <SettingsRow
            label={t("settings.language")}
            disabled={!loaded || languageUpdating}
            onPress={() => setLanguageModalVisible(true)}
            accessibilityLabel={t("settings.languageLabel", {
              language: languageLabel,
            })}
            accessibilityHint={t("settings.languageHint")}
          >
            <SettingsValue value={languageLabel} showChevron />
          </SettingsRow>
          <SettingsRow
            label={t("settings.appearance")}
            description={t("settings.appearanceDescription")}
            helperText={t("settings.comingSoon")}
            disabled
          >
            <SettingsSwitch
              value
              disabled
              accessibilityLabel={t("settings.darkModeAccessibility")}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title={t("settings.alarm")}>
          <SettingsRow
            label={t("settings.autoDismiss")}
            description={t("settings.autoDismissDescription")}
            disabled={!loaded}
          >
            <SettingsSwitch
              value={settings.autoDismissEnabled}
              disabled={!loaded}
              onValueChange={(next) =>
                void update({ autoDismissEnabled: next })
              }
              accessibilityLabel={t("settings.autoDismissAccessibility", {
                state: t(
                  settings.autoDismissEnabled
                    ? "common.states.enabled"
                    : "common.states.disabled",
                ),
              })}
              accessibilityHint={t("settings.autoDismissHint")}
            />
          </SettingsRow>
          <SettingsRow
            label={t("settings.snoozeDuration")}
            description={t("settings.snoozeDescription")}
            disabled={!loaded}
            onPress={() => setSnoozeModalVisible(true)}
            accessibilityLabel={t("settings.snoozeAccessibility", {
              duration: snoozeLabel,
            })}
            accessibilityHint={t("settings.snoozeHint")}
          >
            <SettingsValue value={snoozeLabel} showChevron />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title={t("settings.accessibility")}>
          <SettingsRow
            label={t("settings.showTileNumbers")}
            description={t("settings.showTileNumbersDescription")}
            helperText={
              screenReaderEnabled === true
                ? t("settings.screenReaderForced")
                : undefined
            }
            disabled={!loaded || screenReaderEnabled === true}
          >
            <SettingsSwitch
              value={showTileNumbers}
              disabled={!loaded || screenReaderEnabled === true}
              onValueChange={(next) => void update({ showTileNumbers: next })}
              accessibilityLabel={t("settings.showTileNumbersAccessibility", {
                state: t(
                  showTileNumbers
                    ? "common.states.enabled"
                    : "common.states.disabled",
                ),
              })}
              accessibilityHint={
                screenReaderEnabled === true
                  ? t("settings.screenReaderForced")
                  : t("settings.showTileNumbersHint")
              }
            />
          </SettingsRow>
        </SettingsSection>
      </ScrollView>

      <LanguageSelectionModal
        visible={languageModalVisible}
        selected={settings.language}
        disabled={languageUpdating}
        onCancel={() => setLanguageModalVisible(false)}
        onSelect={(language) => void selectLanguage(language)}
      />
      <SnoozeDurationModal
        visible={snoozeModalVisible}
        initialMinutes={settings.snoozeMinutes}
        onCancel={() => setSnoozeModalVisible(false)}
        onConfirm={(minutes) => {
          setSnoozeModalVisible(false);
          void update({ snoozeMinutes: minutes });
        }}
      />
    </SafeAreaView>
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
});
