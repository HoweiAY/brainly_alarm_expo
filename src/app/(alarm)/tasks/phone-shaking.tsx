import { TaskHeader } from "@/components/TaskHeader";
import { useAlarmDismissal } from "@/hooks/useAlarmDismissal";
import { usePhoneShaking } from "@/tasks/usePhoneShaking";
import { colors, radii, spacing, typography } from "@/theme";
import { Lucide } from "@react-native-vector-icons/lucide";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PhoneShakingScreen() {
  const dismiss = useAlarmDismissal();
  const { remainingShakes, totalShakes, progress } = usePhoneShaking({
    onComplete: () => {
      void dismiss();
    },
  });

  const counterText = `${remainingShakes} shake(s) to go!`;

  return (
    <SafeAreaView style={styles.container}>
      <TaskHeader title="Shake" onAutoDismiss={dismiss} />
      <View style={styles.column}>
        <Text style={styles.title} accessibilityRole="header">
          Shake your phone to stop the alarm!
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
          accessibilityLabel={`Progress: ${remainingShakes} of ${totalShakes} shakes remaining`}
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

const styles = StyleSheet.create({
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
});
