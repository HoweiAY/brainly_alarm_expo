import { TaskHeader } from "@/components/TaskHeader";
import { useAlarmDismissal } from "@/hooks/useAlarmDismissal";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { usePhoneShaking } from "@/tasks/usePhoneShaking";
import { createThemedStyles, radii, spacing, typography } from "@/theme";
import { Lucide } from "@react-native-vector-icons/lucide";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PhoneShakingScreen() {
  const dismiss = useAlarmDismissal();
  const { t } = useAppTranslation();
  const { colors, styles } = useStyles();
  const { remainingShakes, totalShakes, progress } = usePhoneShaking({
    onComplete: () => {
      void dismiss();
    },
  });

  const counterText = t("tasks.shake.remaining", { count: remainingShakes });

  return (
    <SafeAreaView style={styles.container}>
      <TaskHeader title={t("common.tasks.Shake")} onAutoDismiss={dismiss} />
      <View style={styles.column}>
        <Text style={styles.title} accessibilityRole="header">
          {t("tasks.shake.instruction")}
        </Text>
        <Text
          style={styles.counter}
          accessibilityLabel={counterText}
          accessibilityLiveRegion="polite"
        >
          {counterText}
        </Text>
        <View
          style={styles.iconWrap}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Lucide name="vibrate" size={160} color={colors.primary} />
        </View>
        <View
          accessible
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel={t("tasks.shake.progress", {
            remaining: remainingShakes,
            total: totalShakes,
          })}
          accessibilityValue={{
            now: remainingShakes,
            min: 0,
            max: totalShakes,
          }}
        >
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    textAlign: "center",
  },
  counter: {
    ...typography.h3,
    color: colors.text,
  },
  iconWrap: {
    marginVertical: spacing.xl,
  },
  progressTrack: {
    flexDirection: "row",
    width: "60%",
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.primary,
  },
}));
