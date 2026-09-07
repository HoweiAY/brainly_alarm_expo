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
import { colors, radii, spacing, typography } from "@/theme";
import { Lucide } from "@react-native-vector-icons/lucide";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function SettingsLoadError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <SafeAreaView style={styles.errorContainer} edges={["top", "bottom"]}>
      <View style={styles.errorContent}>
        <Lucide name="alert-triangle" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Couldn&apos;t load settings</Text>
        <Text style={styles.errorMessage}>
          Your saved preferences couldn&apos;t be read. Alarms won&apos;t start
          until settings load.
        </Text>
        {error ? <Text style={styles.errorDetail}>{error}</Text> : null}
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Retry loading settings"
          accessibilityHint="Attempts to read saved settings again"
          onPress={onRetry}
        >
          <Lucide name="rotate-cw" size={20} color={colors.primaryFg} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const loaded = useSettingsStore((s) => s.loaded);
  const initError = useSettingsStore((s) => s.initError);

  useEffect(() => {
    void useSettingsStore.getState().ensureLoaded();
  }, []);

  const retry = useCallback(() => {
    void useSettingsStore.getState().init();
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
      {loaded ? (
        <AlarmStoreInit />
      ) : initError ? (
        <SettingsLoadError error={initError} onRetry={retry} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 1,
    elevation: 1,
  },
  errorContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  errorDetail: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  retryButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  retryButtonText: {
    ...typography.bodyEmphasis,
    color: colors.primaryFg,
  },
});
