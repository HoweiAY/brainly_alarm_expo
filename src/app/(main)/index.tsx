import { Button, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brainly Alarm</Text>
      <Button
        title="Memory Game (Normal)"
        onPress={() => router.push("/(alarm)/tasks/memory-game/3/Normal")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
