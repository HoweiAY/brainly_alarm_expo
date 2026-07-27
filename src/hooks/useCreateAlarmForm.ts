import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { weekdays } from "@/data/constants";
import { useAlarmStore } from "@/store/alarmStore";
import type { Alarm, Difficulty, TaskType, Weekday } from "@/data/types";

export type Period = "AM" | "PM";

export interface Time12 {
  hour12: number;
  period: Period;
}

export function to12Hour(hour24: number): Time12 {
  const period: Period = hour24 < 12 ? "AM" : "PM";
  const mod = hour24 % 12;
  const hour12 = mod === 0 ? 12 : mod;
  return { hour12, period };
}

export function to24Hour(hour12: number, period: Period): number {
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
}

export interface CreateAlarmUiState {
  alarmId: string | null;
  weekdaysSelected: Weekday[];
  hourSelected: number;
  minuteSelected: number;
  taskSelected: TaskType;
  roundsSelected: number;
  difficultySelected: Difficulty;
  alarmSoundSelected: string;
  alarmSoundUri: string | null;
  snoozeEnabled: boolean;
  taskSelectorExpanded: boolean;
  enabled: boolean;
}

export interface UseCreateAlarmFormResult extends CreateAlarmUiState {
  taskConfigurable: boolean;
  toggleWeekday: (weekday: Weekday) => void;
  selectAllDays: () => void;
  setHour: (hour24: number) => void;
  setMinute: (minute: number) => void;
  setTask: (task: TaskType) => void;
  setRounds: (rounds: number) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  pickSound: () => void;
  toggleSnooze: () => void;
  expandTaskSelector: (expanded: boolean) => void;
  buildDraft: () => Omit<Alarm, "id">;
  handleConfirm: () => void;
  handleCancel: () => void;
  reset: (alarm?: Alarm | null) => void;
}

const DEFAULTS: Omit<CreateAlarmUiState, "alarmId"> = {
  weekdaysSelected: [],
  hourSelected: 8,
  minuteSelected: 0,
  taskSelected: "Memory",
  roundsSelected: 1,
  difficultySelected: "Easy",
  alarmSoundSelected: "Default",
  alarmSoundUri: null,
  snoozeEnabled: true,
  taskSelectorExpanded: false,
  enabled: true,
};

function isTaskConfigurable(task: TaskType): boolean {
  return task !== "Shake phone" && task !== "None";
}

function fromAlarm(alarm: Alarm): Omit<CreateAlarmUiState, "alarmId"> {
  const isCustom = alarm.sound !== null;
  return {
    weekdaysSelected: [...alarm.days],
    hourSelected: alarm.hour,
    minuteSelected: alarm.minute,
    taskSelected: alarm.task,
    roundsSelected: alarm.rounds,
    difficultySelected: alarm.difficulty,
    alarmSoundSelected: isCustom ? (alarm.sound ?? "Default") : "Default",
    alarmSoundUri: alarm.sound,
    snoozeEnabled: alarm.snooze,
    taskSelectorExpanded: false,
    enabled: alarm.enabled,
  };
}

export function useCreateAlarmForm(
  initial?: Alarm | null,
): UseCreateAlarmFormResult {
  const router = useRouter();
  const [state, setState] = useState<CreateAlarmUiState>(() => ({
    alarmId: initial?.id ?? null,
    ...(initial ? fromAlarm(initial) : DEFAULTS),
  }));

  const taskConfigurable = useMemo(
    () => isTaskConfigurable(state.taskSelected),
    [state.taskSelected],
  );

  const reset = useCallback((alarm?: Alarm | null) => {
    setState({
      alarmId: alarm?.id ?? null,
      ...(alarm ? fromAlarm(alarm) : DEFAULTS),
    });
  }, []);

  const toggleWeekday = useCallback((weekday: Weekday) => {
    setState((prev) => {
      const present = prev.weekdaysSelected.includes(weekday);
      const next = present
        ? prev.weekdaysSelected.filter((w) => w !== weekday)
        : [...prev.weekdaysSelected, weekday];
      return { ...prev, weekdaysSelected: next };
    });
  }, []);

  const selectAllDays = useCallback(() => {
    setState((prev) => ({ ...prev, weekdaysSelected: [...weekdays] }));
  }, []);

  const setHour = useCallback((hour24: number) => {
    setState((prev) => ({ ...prev, hourSelected: hour24 }));
  }, []);

  const setMinute = useCallback((minute: number) => {
    setState((prev) => ({ ...prev, minuteSelected: minute }));
  }, []);

  const setTask = useCallback((task: TaskType) => {
    setState((prev) => ({
      ...prev,
      taskSelected: task,
      taskSelectorExpanded: false,
    }));
  }, []);

  const setRounds = useCallback((rounds: number) => {
    const clamped = Math.max(1, Math.min(5, Math.round(rounds)));
    setState((prev) => ({ ...prev, roundsSelected: clamped }));
  }, []);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    setState((prev) => ({ ...prev, difficultySelected: difficulty }));
  }, []);

  const toggleSnooze = useCallback(() => {
    setState((prev) => ({ ...prev, snoozeEnabled: !prev.snoozeEnabled }));
  }, []);

  const expandTaskSelector = useCallback((expanded: boolean) => {
    setState((prev) => ({ ...prev, taskSelectorExpanded: expanded }));
  }, []);

  const pickSound = useCallback(() => {
    // Seam 2: expo-document-picker + expo-file-system copy-to-sandbox (Phase 3, docs/06 §2).
  }, []);

  const buildDraft = useCallback((): Omit<Alarm, "id"> => {
    return {
      days: [...state.weekdaysSelected],
      hour: state.hourSelected,
      minute: state.minuteSelected,
      task: state.taskSelected,
      rounds: state.roundsSelected,
      difficulty: state.difficultySelected,
      sound: state.alarmSoundUri,
      snooze: state.snoozeEnabled,
      enabled: state.enabled,
    };
  }, [state]);

  const handleConfirm = useCallback(() => {
    const draft = buildDraft();
    const store = useAlarmStore.getState();
    const persist = async () => {
      try {
        if (state.alarmId != null) {
          await store.updateAlarm({ id: state.alarmId, ...draft });
        } else {
          await store.insertAlarm(draft);
        }
        // Seam 1: AlarmScheduler.rescheduleWeekly(alarm) — out of scope (no native scheduler yet).
      } catch (e) {
        console.error("persistAlarm failed", e);
      } finally {
        router.back();
      }
    };
    void persist();
  }, [buildDraft, router, state.alarmId]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return {
    ...state,
    taskConfigurable,
    toggleWeekday,
    selectAllDays,
    setHour,
    setMinute,
    setTask,
    setRounds,
    setDifficulty,
    pickSound,
    toggleSnooze,
    expandTaskSelector,
    buildDraft,
    handleConfirm,
    handleCancel,
    reset,
  };
}
