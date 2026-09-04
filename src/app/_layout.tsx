import {
  parseAlarmSnapshot,
  reconcileSchedules,
  snapshotToQueryParams,
} from "@/alarms/scheduling";
import {
  dismissOldAlarmIfActive,
  useAlarmNotifications,
} from "@/hooks/useAlarmNotifications";
import { useAlarmFiringStore } from "@/store/alarmFiringStore";
import { useAlarmRegistrationsStore } from "@/store/alarmRegistrationsStore";
import { useAlarmStore } from "@/store/alarmStore";
import { useSettingsStore } from "@/store/settingsStore";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

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
  if (parsed.path !== "alarm") return;
  const queryParams = (parsed.queryParams ?? {}) as Record<
    string,
    string | string[] | undefined
  >;
  const snapshot = parseAlarmSnapshot(queryParams);
  if (!snapshot) return;
  void (async () => {
    const alarm = await useAlarmStore.getState().getAlarmById(snapshot.alarmId);
    if (!alarm) return;
    await dismissOldAlarmIfActive(snapshot);
    useAlarmFiringStore.getState().setActive(snapshot);
    router.replace({
      pathname: "/alarm",
      params: snapshotToQueryParams(snapshot),
    });
  })();
}

function AlarmStoreInit() {
  const router = useRouter();
  useAlarmNotifications();
  useEffect(() => {
    useAlarmStore.getState().loadAlarms();
    useAlarmRegistrationsStore.getState().load();

    const sub = Linking.addEventListener("url", ({ url }) =>
      handleAlarmUrl(url, router),
    );
    Linking.getInitialURL()
      .then(async (url) => {
        if (url) {
          handleAlarmUrl(url, router);
          return;
        }
        await useAlarmFiringStore.getState().init();
        const persisted = useAlarmFiringStore.getState().activeSnapshot;
        if (persisted) {
          router.replace({
            pathname: "/alarm",
            params: snapshotToQueryParams(persisted),
          });
        }
      })
      .catch((err: unknown) => {
        console.warn("getInitialURL / init failed", err);
      });

    let alarmsReady = useAlarmStore.getState().loaded;
    let registryReady = useAlarmRegistrationsStore.getState().loaded;
    const tryReconcile = () => {
      if (alarmsReady && registryReady) {
        const alarmInitError = (
          useAlarmStore.getState() as { initError?: string | null }
        ).initError;
        const regInitError = useAlarmRegistrationsStore.getState().initError;
        if (alarmInitError)
          console.warn("alarmStore init error:", alarmInitError);
        if (regInitError)
          console.warn("alarmRegistrationsStore init error:", regInitError);
        void reconcileSchedules();
      }
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
          useAlarmRegistrationsStore as unknown as StoreWithLoaded,
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
  const [settingsReady, setSettingsReady] = useState(
    useSettingsStore.getState().loaded,
  );

  useEffect(() => {
    let active = true;
    void useSettingsStore
      .getState()
      .ensureLoaded()
      .then(() => {
        if (active) setSettingsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

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
      {settingsReady ? <AlarmStoreInit /> : null}
    </>
  );
}
