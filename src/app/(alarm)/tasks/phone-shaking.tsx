import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePhoneShaking } from "@/tasks/usePhoneShaking";
import { colors, radii, spacing, typography } from "@/theme";
import { INITIAL_SHAKE_MAX } from "@/tasks/phoneShaking";

export default function PhoneShakingScreen() {
  const router = useRouter();
  const { remainingShakes } = usePhoneShaking({
    onComplete: () => {
      router.dismissAll();
      router.replace("/(main)");
    },
  });

  const counterText = `${remainingShakes} shake(s) to go!`;
  const total = INITIAL_SHAKE_MAX;
  const progress = Math.max(0, Math.min(1, remainingShakes / total));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Shake</Text>
      </View>
      <View style={styles.column}>
        <Text style={styles.title}>Shake your phone to stop the alarm!</Text>
        <Text style={styles.counter} accessibilityLabel={counterText}>
          {counterText}
        </Text>
        <View style={styles.iconWrap}>
          <Lucide name="vibrate" size={160} color={colors.primary} />
        </View>
        <View style={styles.progressTrack}>
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
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
