import { PROTOTYPE_ROUNDS } from "@/tasks/mathEquation";
import { useMathEquation } from "@/tasks/useMathEquation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MathEquationScreen() {
  const router = useRouter();
  const { rounds, difficulty } = useLocalSearchParams<{
    rounds?: string;
    difficulty?: string;
  }>();
  void rounds;
  void difficulty;

  const { equation, input, isCorrect, currentRound, setInput, submit } =
    useMathEquation({
      rounds: PROTOTYPE_ROUNDS,
      onComplete: () => {
        router.dismissAll();
        router.replace("/(main)");
      },
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.column}>
        <Text style={styles.round}>
          {currentRound}/{PROTOTYPE_ROUNDS}
        </Text>
        <Text style={styles.instruction}>
          What is the result of the expression?
        </Text>
        <Text style={styles.expression}>{equation}</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          editable={isCorrect === null}
          keyboardType="numeric"
          numberOfLines={1}
          placeholder="Answer"
          accessibilityLabel="Answer"
        />
        {isCorrect === null ? (
          <Pressable
            style={styles.submit}
            onPress={submit}
            accessibilityRole="button"
          >
            <Text style={styles.submitText}>Submit</Text>
          </Pressable>
        ) : (
          <Text
            style={[
              styles.result,
              { color: isCorrect ? "#4CAF50" : "#F44336" },
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
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  round: {
    fontSize: 16,
    color: "#555",
  },
  instruction: {
    fontSize: 18,
    textAlign: "center",
  },
  expression: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    width: "80%",
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    textAlign: "center",
  },
  submit: {
    width: "40%",
    backgroundColor: "#6200EE",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  submitText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  result: {
    fontSize: 32,
    fontWeight: "bold",
    paddingVertical: 10,
  },
});
