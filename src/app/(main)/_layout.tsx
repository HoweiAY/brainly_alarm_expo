import { useTheme } from "@/theme";
import { Stack } from "expo-router";

export default function MainLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="create-alarm"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="create-alarm/[alarmId]"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
    </Stack>
  );
}
