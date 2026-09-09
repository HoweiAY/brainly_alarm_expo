import { CreateAlarmForm } from "@/components/CreateAlarmForm";
import type { Alarm } from "@/data/types";
import { useAlarmById } from "@/hooks/useAlarmById";
import { useCreateAlarmForm } from "@/hooks/useCreateAlarmForm";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { useAlarmStore } from "@/store/alarmStore";
import { createThemedStyles, typography } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function EditAlarm({ alarm }: { alarm: Alarm }) {
  const { t } = useAppTranslation();
  const form = useCreateAlarmForm(alarm);
  return <CreateAlarmForm title={t("editor.editTitle")} form={form} />;
}

export default function EditAlarmScreen() {
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { alarm, loading, error } = useAlarmById(alarmId);
  const router = useRouter();
  const { t } = useAppTranslation();
  const { colors, styles } = useStyles();

  const retry = () => {
    useAlarmStore.getState().loadAlarms();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {loading ? (
        <View
          style={styles.loadingContainer}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("editor.loadingLabel")}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t("editor.loading")}</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("editor.loadError")}</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("editor.retryLabel")}
            accessibilityHint={t("editor.retryHint")}
            onPress={retry}
          >
            <Text style={styles.createLink}>{t("editor.tryAgain")}</Text>
          </Pressable>
        </View>
      ) : alarm ? (
        <EditAlarm key={alarm.id} alarm={alarm} />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("editor.notFound")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("editor.notFoundLabel")}
            accessibilityHint={t("editor.notFoundHint")}
            onPress={() => router.replace("/create-alarm")}
          >
            <Text style={styles.createLink}>{t("editor.createNew")}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
  errorDetail: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: "center",
  },
  createLink: {
    ...typography.bodyEmphasis,
    color: colors.primary,
  },
}));
