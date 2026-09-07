import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
