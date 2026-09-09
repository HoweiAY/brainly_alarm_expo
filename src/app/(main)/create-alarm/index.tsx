import { CreateAlarmForm } from "@/components/CreateAlarmForm";
import { useCreateAlarmForm } from "@/hooks/useCreateAlarmForm";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { createThemedStyles } from "@/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateAlarmScreen() {
  const { t } = useAppTranslation();
  const { styles } = useStyles();
  const form = useCreateAlarmForm(null);
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <CreateAlarmForm title={t("editor.createTitle")} form={form} />
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));
