import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePhoneShaking } from "@/tasks/usePhoneShaking";

export default function PhoneShakingScreen() {
  const router = useRouter();
  const { remainingShakes } = usePhoneShaking({
    onComplete: () => {
      router.dismissAll();
      router.replace("/(main)");
    },
  });

  const counterText = `${remainingShakes} shake(s) to go!`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.column}>
        <Text style={styles.title}>Shake your phone to stop the alarm!</Text>
        <Text style={styles.counter} accessibilityLabel={counterText}>
          {counterText}
        </Text>
        <Text
          style={styles.icon}
          accessibilityRole="image"
          accessibilityLabel="Shake icon"
        >
          📳
        </Text>
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
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#03A9F4",
    textAlign: "center",
  },
  counter: {
    fontSize: 18,
    color: "#555",
  },
  icon: {
    fontSize: 200,
  },
});
