import { Stack } from "expo-router";

export default function AlarmLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="tasks/memory-game/[rounds]/[difficulty]"
        options={{ title: "Memory" }}
      />
    </Stack>
  );
}
