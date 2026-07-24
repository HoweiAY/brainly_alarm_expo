import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

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
    </>
  );
}
