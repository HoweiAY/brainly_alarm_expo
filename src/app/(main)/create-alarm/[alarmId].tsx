import { CreateAlarmForm } from "@/components/CreateAlarmForm";
import { useAlarmById } from "@/hooks/useAlarmById";
import { useCreateAlarmForm } from "@/hooks/useCreateAlarmForm";
import type { Alarm } from "@/data/types";
import { colors, typography } from "@/theme";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function EditAlarm({ alarm }: { alarm: Alarm }) {
  const form = useCreateAlarmForm(alarm);
  return <CreateAlarmForm title="Edit alarm" form={form} />;
}

export default function EditAlarmScreen() {
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { alarm, loading } = useAlarmById(alarmId);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {loading || !alarm ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading alarm…</Text>
        </View>
      ) : (
        <EditAlarm key={alarm.id} alarm={alarm} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
