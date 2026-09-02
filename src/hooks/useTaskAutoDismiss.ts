import {
  DEFAULT_TASK_TIMEOUT_CONFIG,
  createTaskTimeoutSchedule,
  getTaskTimeoutState,
  postponeTaskTimeout,
  type TaskTimeoutConfig,
  type TaskTimeoutSchedule,
  type TaskTimeoutState,
} from "@/tasks/taskTimeout";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export interface UseTaskAutoDismissOptions {
  config?: Partial<TaskTimeoutConfig>;
  onTimeout: () => void | Promise<void>;
}

export interface UseTaskAutoDismissResult {
  countdownVisible: boolean;
  remainingSeconds: number;
  skip: () => void;
}

const TICK_INTERVAL_MS = 1_000;

export function useTaskAutoDismiss({
  config,
  onTimeout,
}: UseTaskAutoDismissOptions): UseTaskAutoDismissResult {
  const [initial] = useState(() => {
    const resolvedConfig: TaskTimeoutConfig = {
      enabled: config?.enabled ?? DEFAULT_TASK_TIMEOUT_CONFIG.enabled,
      initialDelayMs:
        config?.initialDelayMs ?? DEFAULT_TASK_TIMEOUT_CONFIG.initialDelayMs,
      countdownMs:
        config?.countdownMs ?? DEFAULT_TASK_TIMEOUT_CONFIG.countdownMs,
      skipDelayMs:
        config?.skipDelayMs ?? DEFAULT_TASK_TIMEOUT_CONFIG.skipDelayMs,
    };
    const now = dayjs();
    const schedule = createTaskTimeoutSchedule(now, resolvedConfig);
    return {
      config: resolvedConfig,
      schedule,
      state: getTaskTimeoutState(schedule, now, resolvedConfig.enabled),
    };
  });
  const configRef = useRef(initial.config);
  const scheduleRef = useRef<TaskTimeoutSchedule>(initial.schedule);
  const [state, setState] = useState<TaskTimeoutState>(initial.state);
  const onTimeoutRef = useRef(onTimeout);
  const completedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const sync = useCallback(() => {
    const nextState = getTaskTimeoutState(
      scheduleRef.current,
      dayjs(),
      configRef.current.enabled,
    );
    setState((current) =>
      current.phase === nextState.phase &&
      current.remainingSeconds === nextState.remainingSeconds
        ? current
        : nextState,
    );
    if (
      nextState.phase === "expired" &&
      !completedRef.current &&
      !inFlightRef.current
    ) {
      inFlightRef.current = true;
      try {
        void Promise.resolve(onTimeoutRef.current()).then(
          () => {
            completedRef.current = true;
            inFlightRef.current = false;
          },
          () => {
            inFlightRef.current = false;
          },
        );
      } catch {
        inFlightRef.current = false;
      }
    }
    return nextState;
  }, []);

  const enabled = config?.enabled ?? DEFAULT_TASK_TIMEOUT_CONFIG.enabled;
  useEffect(() => {
    configRef.current.enabled = enabled;
    sync();
    if (!enabled) return;

    const interval = setInterval(sync, TICK_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener("change", (next) => {
      if (next === "active") sync();
    });
    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [enabled, sync]);

  const skip = useCallback(() => {
    if (!configRef.current.enabled || completedRef.current) return;
    const currentState = sync();
    if (currentState.phase !== "countdown") return;

    const now = dayjs();
    scheduleRef.current = postponeTaskTimeout(now, configRef.current);
    setState(
      getTaskTimeoutState(scheduleRef.current, now, configRef.current.enabled),
    );
  }, [sync]);

  return {
    countdownVisible: state.countdownVisible,
    remainingSeconds: state.remainingSeconds,
    skip,
  };
}
