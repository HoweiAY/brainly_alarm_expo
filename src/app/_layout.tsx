import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack initialRouteName="(main)">
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(alarm)"
        options={{ presentation: "fullScreenModal", headerShown: false }}
      />
    </Stack>
  );
}
