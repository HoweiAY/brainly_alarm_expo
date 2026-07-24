import { CreateAlarmForm } from "@/components/CreateAlarmForm";
import { useAlarmById } from "@/hooks/useAlarmById";
import { useCreateAlarmForm } from "@/hooks/useCreateAlarmForm";
import type { Alarm } from "@/data/types";
import { colors, typography } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function EditAlarm({ alarm }: { alarm: Alarm }) {
  const form = useCreateAlarmForm(alarm);
  return <CreateAlarmForm title="Edit alarm" form={form} />;
}

export default function EditAlarmScreen() {
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { alarm, loading } = useAlarmById(alarmId);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading alarm…</Text>
        </View>
      ) : alarm ? (
        <EditAlarm key={alarm.id} alarm={alarm} />
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Alarm not found.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/create-alarm")}
          >
            <Text style={styles.createLink}>Create a new alarm</Text>
          </Pressable>
        </View>
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
  createLink: {
    ...typography.bodyEmphasis,
    color: colors.primary,
  },
});
