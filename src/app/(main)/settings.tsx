import {
  SettingsRow,
  SettingsSwitch,
  SettingsValue,
} from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SnoozeDurationModal } from "@/components/settings/SnoozeDurationModal";
import type { UserSettings } from "@/data/types";
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

const COMING_SOON = "Coming soon";

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore((s) => s.settings);
  const loaded = useSettingsStore((s) => s.loaded);
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);

  const update = async (patch: Partial<UserSettings>) => {
    try {
      await useSettingsStore.getState().updateSettings(patch);
    } catch (e) {
      console.error("updateSettings failed", e);
      Alert.alert("Error", "Could not save the setting. Please try again.");
    }
  };

  const snoozeLabel = `${settings.snoozeMinutes} min`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint="Returns to home screen"
          onPress={() => router.back()}
        >
          <Lucide name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
        <View style={styles.iconPlaceholder} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsSection title="General">
          <SettingsRow
            label="Language"
            helperText={COMING_SOON}
            disabled
            accessibilityLabel="Language, English, coming soon"
          >
            <SettingsValue value="English" />
          </SettingsRow>
          <SettingsRow
            label="Appearance"
            description="Switch between dark and light mode"
            helperText={COMING_SOON}
            disabled
          >
            <SettingsSwitch
              value
              disabled
              accessibilityLabel="Dark mode, coming soon"
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Alarm">
          <SettingsRow
            label="Auto dismiss tasks"
            description="Automatically dismiss the alarm after a task times out"
            disabled={!loaded}
          >
            <SettingsSwitch
              value={settings.autoDismissEnabled}
              disabled={!loaded}
              onValueChange={(next) =>
                void update({ autoDismissEnabled: next })
              }
              accessibilityLabel={`Auto dismiss tasks ${settings.autoDismissEnabled ? "enabled" : "disabled"}`}
              accessibilityHint="Toggles the auto-dismiss countdown on alarm tasks"
            />
          </SettingsRow>
          <SettingsRow
            label="Snooze duration"
            description="How long an alarm stays snoozed"
            disabled={!loaded}
            onPress={() => setSnoozeModalVisible(true)}
            accessibilityLabel={`Snooze duration, ${snoozeLabel}`}
            accessibilityHint="Opens a dialog to change the snooze duration"
          >
            <SettingsValue value={snoozeLabel} showChevron />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Accessibility">
          <SettingsRow
            label="Show tile numbers"
            description="Number the tiles in the Memory task"
            disabled={!loaded}
          >
            <SettingsSwitch
              value={settings.showTileNumbers}
              disabled={!loaded}
              onValueChange={(next) => void update({ showTileNumbers: next })}
              accessibilityLabel={`Show tile numbers ${settings.showTileNumbers ? "enabled" : "disabled"}`}
              accessibilityHint="Toggles numbers on Memory task tiles"
            />
          </SettingsRow>
          <SettingsRow
            label="Colorblind mode"
            description="Use a colorblind-friendly palette"
            helperText={COMING_SOON}
            disabled
            onPress={() => {}}
            accessibilityLabel="Colorblind mode, coming soon"
          >
            <Lucide name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsRow>
        </SettingsSection>
      </ScrollView>

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
