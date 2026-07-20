import { useRouter } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateAlarmScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.column}>
        <Text style={styles.text}>Create alarm — not implemented yet</Text>
        <Button title="Back" onPress={() => router.back()} />
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
  text: {
    fontSize: 18,
    color: "#555",
    textAlign: "center",
  },
});
