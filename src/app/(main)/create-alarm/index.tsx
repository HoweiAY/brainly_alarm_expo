import { CreateAlarmForm } from "@/components/CreateAlarmForm";
import { useCreateAlarmForm } from "@/hooks/useCreateAlarmForm";
import { colors } from "@/theme";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateAlarmScreen() {
  const form = useCreateAlarmForm(null);
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <CreateAlarmForm title="Create alarm" form={form} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
