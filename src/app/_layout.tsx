import {
  parseAlarmSnapshot,
  reconcileSchedules,
  snapshotToQueryParams,
} from "@/alarms/scheduling";
import { useScheduledAlarmsStore } from "@/store/scheduledAlarmsStore";
import { useAlarmStore } from "@/store/alarmStore";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

type StoreWithLoaded = {
  getState: () => { loaded: boolean };
  subscribe: (
    listener: (state: { loaded: boolean }, prev: { loaded: boolean }) => void,
  ) => () => void;
};

function runOnceLoaded(store: StoreWithLoaded, cb: () => void): () => void {
  if (store.getState().loaded) {
    cb();
    return () => {};
  }
  let done = false;
  const unsub = store.subscribe((state, prev) => {
    if (!done && state.loaded && !prev.loaded) {
      done = true;
      unsub();
      cb();
    }
  });
  return unsub;
}

function handleAlarmUrl(
  url: string,
  router: ReturnType<typeof useRouter>,
): void {
  const parsed = Linking.parse(url);
  const queryParams = (parsed.queryParams ?? {}) as Record<
    string,
    string | string[] | undefined
  >;
  const snapshot = parseAlarmSnapshot(queryParams);
  if (!snapshot) return;
  router.replace({
    pathname: "/alarm",
    params: snapshotToQueryParams(snapshot),
  });
}

function AlarmStoreInit() {
  const router = useRouter();
  useEffect(() => {
    useAlarmStore.getState().loadAlarms();
    useScheduledAlarmsStore.getState().load();

    const sub = Linking.addEventListener("url", ({ url }) =>
      handleAlarmUrl(url, router),
    );
    Linking.getInitialURL().then((url) => {
      if (url) handleAlarmUrl(url, router);
    });

    let alarmsReady = useAlarmStore.getState().loaded;
    let registryReady = useScheduledAlarmsStore.getState().loaded;
    const tryReconcile = () => {
      if (alarmsReady && registryReady) void reconcileSchedules();
    };
    const disposers: (() => void)[] = [];
    if (!alarmsReady) {
      disposers.push(
        runOnceLoaded(useAlarmStore as unknown as StoreWithLoaded, () => {
          alarmsReady = true;
          tryReconcile();
        }),
      );
    }
    if (!registryReady) {
      disposers.push(
        runOnceLoaded(
          useScheduledAlarmsStore as unknown as StoreWithLoaded,
          () => {
            registryReady = true;
            tryReconcile();
          },
        ),
      );
    }
    tryReconcile();

    return () => {
      sub.remove();
      disposers.forEach((d) => d());
    };
  }, [router]);
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
