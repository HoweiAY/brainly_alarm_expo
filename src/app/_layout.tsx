import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAlarmStore } from "@/store/alarmStore";

function AlarmStoreInit() {
  useEffect(() => {
    useAlarmStore.getState().loadAlarms();
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack initialRouteName="(main)">
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(alarm)"
          options={{ presentation: "fullScreenModal", headerShown: false }}
        />
      </Stack>
      <AlarmStoreInit />
    </>
  );
}
