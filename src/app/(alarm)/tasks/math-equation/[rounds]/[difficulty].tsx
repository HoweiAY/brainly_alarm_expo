import { PROTOTYPE_ROUNDS } from "@/tasks/mathEquation";
import { useMathEquation } from "@/tasks/useMathEquation";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, spacing, typography } from "@/theme";
import { useAlarmDismissal } from "@/hooks/useAlarmDismissal";

export default function MathEquationScreen() {
  const dismiss = useAlarmDismissal();
  const { rounds, difficulty } = useLocalSearchParams<{
    rounds?: string;
    difficulty?: string;
  }>();
  void rounds;
  void difficulty;
  const [focused, setFocused] = useState(false);

  const { equation, input, isCorrect, currentRound, setInput, submit } =
    useMathEquation({
      rounds: PROTOTYPE_ROUNDS,
      onComplete: () => {
        void dismiss();
      },
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Math</Text>
      </View>
      <View style={styles.column}>
        <Text style={styles.round}>
          {currentRound}/{PROTOTYPE_ROUNDS}
        </Text>
        <Text style={styles.instruction}>
          What is the result of the expression?
        </Text>
        <Text style={styles.expression}>{equation}</Text>
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
          placeholder="Answer"
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          accessibilityLabel="Answer"
        />
        {isCorrect === null ? (
          <Pressable
            style={({ pressed }) => [
              styles.submit,
              pressed && styles.submitPressed,
            ]}
            onPress={submit}
            accessibilityRole="button"
          >
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        ) : (
          <Text
            style={[
              styles.result,
              { color: isCorrect ? colors.success : colors.danger },
            ]}
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
