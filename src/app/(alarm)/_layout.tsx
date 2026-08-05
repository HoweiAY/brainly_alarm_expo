import { useAlarmFiringStore } from "@/store/alarmFiringStore";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";

export default function AlarmLayout() {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const active = useAlarmFiringStore.getState().activeSnapshot;
      if (active) return true;
      return false;
    });
    return () => sub.remove();
  }, []);

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
