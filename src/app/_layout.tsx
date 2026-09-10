import {
  parseAlarmSnapshot,
  reconcileSchedules,
  snapshotToQueryParams,
} from "@/alarms/scheduling";
import { DEFAULT_USER_SETTINGS } from "@/data/constants";
import {
  dismissOldAlarmIfActive,
  useAlarmNotifications,
} from "@/hooks/useAlarmNotifications";
import { i18n } from "@/i18n";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { useAlarmFiringStore } from "@/store/alarmFiringStore";
import { useAlarmRegistrationsStore } from "@/store/alarmRegistrationsStore";
import { useAlarmStore } from "@/store/alarmStore";
import { useSettingsStore } from "@/store/settingsStore";
import {
  createThemedStyles,
  darkColors,
  radii,
  spacing,
  typography,
  useTheme,
} from "@/theme";
import { Lucide } from "@react-native-vector-icons/lucide";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useCallback, useEffect } from "react";
import { Appearance, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

Appearance.setColorScheme(DEFAULT_USER_SETTINGS.colorScheme);
void SystemUI.setBackgroundColorAsync(darkColors.background);

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
  const { t } = useAppTranslation();
  const { colors, styles } = useRootStyles();

  return (
    <SafeAreaView style={styles.errorContainer} edges={["top", "bottom"]}>
      <View style={styles.errorContent}>
        <Lucide name="alert-triangle" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>{t("root.settingsLoadTitle")}</Text>
        <Text style={styles.errorMessage}>{t("root.settingsLoadMessage")}</Text>
        {error ? <Text style={styles.errorDetail}>{error}</Text> : null}
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("root.retryLabel")}
          accessibilityHint={t("root.retryHint")}
          onPress={onRetry}
        >
          <Lucide name="rotate-cw" size={20} color={colors.primaryFg} />
          <Text style={styles.retryButtonText}>
            {t("common.actions.retry")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const loaded = useSettingsStore((s) => s.loaded);
  const initError = useSettingsStore((s) => s.initError);
  const language = useSettingsStore((s) => s.settings.language);
  const { colorScheme, colors } = useTheme();

  useEffect(() => {
    void useSettingsStore.getState().ensureLoaded();
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    Appearance.setColorScheme(colorScheme);
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colorScheme, colors.background]);

  const retry = useCallback(() => {
    void useSettingsStore.getState().init();
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        initialRouteName="(main)"
        screenOptions={{ contentStyle: { backgroundColor: colors.background } }}
      >
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

const useRootStyles = createThemedStyles((colors) => ({
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
}));
