import { Stack } from "expo-router";

export default function AlarmLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0A0A" },
      }}
    >
      <Stack.Screen name="alarm" />
      <Stack.Screen name="tasks/memory-game/[rounds]/[difficulty]" />
      <Stack.Screen name="tasks/math-equation/[rounds]/[difficulty]" />
      <Stack.Screen name="tasks/phone-shaking" />
    </Stack>
  );
}
