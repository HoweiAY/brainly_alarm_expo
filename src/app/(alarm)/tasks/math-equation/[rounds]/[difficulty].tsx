import { TaskHeader } from "@/components/TaskHeader";
import { announce } from "@/hooks/useAccessibility";
import { useAlarmDismissal } from "@/hooks/useAlarmDismissal";
import { translateTask } from "@/i18n/helpers";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { parseTaskParams } from "@/tasks/params";
import { useMathEquation } from "@/tasks/useMathEquation";
import { colors, radii, spacing, typography } from "@/theme";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MathEquationScreen() {
  const dismiss = useAlarmDismissal();
  const { t } = useAppTranslation();
  const { rounds: roundsParam, difficulty: difficultyParam } =
    useLocalSearchParams<{
      rounds?: string;
      difficulty?: string;
    }>();
  const { rounds, difficulty } = parseTaskParams(roundsParam, difficultyParam);
  const [focused, setFocused] = useState(false);

  const { equation, input, isCorrect, currentRound, setInput, submit } =
    useMathEquation({
      rounds,
      difficulty,
      onComplete: () => {
        void dismiss();
      },
    });

  const prevCorrectRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (isCorrect === false && prevCorrectRef.current !== false) {
      announce(t("tasks.math.incorrectAnnouncement"));
    }
    prevCorrectRef.current = isCorrect;
  }, [isCorrect, t]);

  const resultLabel = t(
    isCorrect ? "common.states.correct" : "common.states.incorrect",
  );

  return (
    <SafeAreaView style={styles.container}>
      <TaskHeader title={translateTask(t, "Math")} onAutoDismiss={dismiss} />
      <View style={styles.column}>
        <Text
          style={styles.round}
          accessibilityLabel={t("tasks.roundLabel", {
            current: currentRound,
            total: rounds,
          })}
        >
          {currentRound}/{rounds}
        </Text>
        <Text style={styles.instruction} accessibilityRole="header">
          {t("tasks.math.instruction")}
        </Text>
        <Text
          style={styles.expression}
          accessibilityLabel={t("tasks.math.equationLabel", { equation })}
        >
          {equation}
        </Text>
        <TextInput
          style={[
            styles.input,
            focused && styles.inputFocused,
            isCorrect === false && styles.inputIncorrect,
          ]}
          value={input}
          onChangeText={setInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={isCorrect === null}
          keyboardType="numeric"
          numberOfLines={1}
          placeholder={t("tasks.math.answer")}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          accessibilityLabel={t("tasks.math.answer")}
          accessibilityHint={t("tasks.math.answerHint")}
        />
        {isCorrect === null ? (
          <Pressable
            style={({ pressed }) => [
              styles.submit,
              pressed && styles.submitPressed,
            ]}
            onPress={submit}
            accessibilityRole="button"
            accessibilityLabel={t("tasks.math.submitLabel")}
            accessibilityHint={t("tasks.math.submitHint")}
          >
            <Text style={styles.submitText}>{t("common.actions.submit")}</Text>
          </Pressable>
        ) : (
          <Text
            style={[
              styles.result,
              { color: isCorrect ? colors.success : colors.danger },
            ]}
            accessibilityRole="text"
            accessibilityLabel={resultLabel}
          >
            {isCorrect ? "✓" : "✗"}
          </Text>
        )}
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
  round: {
    ...typography.caption,
    color: colors.textMuted,
  },
  instruction: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  expression: {
    ...typography.h1,
    color: colors.primary,
    textAlign: "center",
  },
  input: {
    width: "80%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
    backgroundColor: colors.surface,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputIncorrect: {
    borderColor: colors.danger,
  },
  submit: {
    marginTop: spacing.md,
    width: "60%",
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  submitPressed: {
    backgroundColor: colors.primaryPressed,
  },
  submitText: {
    ...typography.bodyEmphasis,
    color: colors.primaryFg,
  },
  result: {
    fontSize: 36,
    fontWeight: "700",
    paddingVertical: spacing.md,
  },
});
