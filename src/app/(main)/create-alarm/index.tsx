import { CreateAlarmForm } from "@/components/CreateAlarmForm";
import { useCreateAlarmForm } from "@/hooks/useCreateAlarmForm";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { colors } from "@/theme";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateAlarmScreen() {
  const { t } = useAppTranslation();
  const form = useCreateAlarmForm(null);
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <CreateAlarmForm title={t("editor.createTitle")} form={form} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
