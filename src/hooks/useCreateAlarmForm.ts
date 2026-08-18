import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  defaultSoundSelection,
  deleteCustomSoundFile,
  isDefaultSound,
  isSoundFileReferenced,
  soundLabelFor,
} from "@/alarms/audioSelection";
import { findConflictingAlarm } from "@/alarms/conflicts";
import { pickAlarmSoundFromDevice } from "@/alarms/pickAlarmSound";
import { setAlarm } from "@/alarms/scheduling";
import { weekdays } from "@/data/constants";
import { useAlarmStore } from "@/store/alarmStore";
import { formatTime } from "@/utils/time";
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
  saving: boolean;
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
  setToDefault: () => void;
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
  ...defaultSoundSelection(),
  snoozeEnabled: true,
  taskSelectorExpanded: false,
  enabled: true,
  saving: false,
};

function isTaskConfigurable(task: TaskType): boolean {
  return task !== "Shake phone" && task !== "None";
}

function fromAlarm(alarm: Alarm): Omit<CreateAlarmUiState, "alarmId"> {
  return {
    weekdaysSelected: [...alarm.days],
    hourSelected: alarm.hour,
    minuteSelected: alarm.minute,
    taskSelected: alarm.task,
    roundsSelected: alarm.rounds,
    difficultySelected: alarm.difficulty,
    alarmSoundSelected: soundLabelFor(alarm.sound),
    alarmSoundUri: alarm.sound,
    snoozeEnabled: alarm.snooze,
    taskSelectorExpanded: false,
    enabled: alarm.enabled,
    saving: false,
  };
}

export function useCreateAlarmForm(
  initial?: Alarm | null,
): UseCreateAlarmFormResult {
  const router = useRouter();
  const stagedFileUriRef = useRef<string | null>(null);
  const disposedRef = useRef(false);
  const saveGenerationRef = useRef(0);
  const persistingRef = useRef(false);
  const pickGenerationRef = useRef(0);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      if (stagedFileUriRef.current) {
        deleteCustomSoundFile(stagedFileUriRef.current);
        stagedFileUriRef.current = null;
      }
    };
  }, []);
  const [state, setState] = useState<CreateAlarmUiState>(() => ({
    alarmId: initial?.id ?? null,
    ...(initial ? fromAlarm(initial) : DEFAULTS),
  }));

  const taskConfigurable = useMemo(
    () => isTaskConfigurable(state.taskSelected),
    [state.taskSelected],
  );

  const reset = useCallback((alarm?: Alarm | null) => {
    if (persistingRef.current) {
      return;
    }
    if (stagedFileUriRef.current) {
      deleteCustomSoundFile(stagedFileUriRef.current);
      stagedFileUriRef.current = null;
    }
    saveGenerationRef.current += 1;
    pickGenerationRef.current += 1;
    setState({
      alarmId: alarm?.id ?? null,
      ...(alarm ? fromAlarm(alarm) : DEFAULTS),
    });
  }, []);

  const toggleWeekday = useCallback((weekday: Weekday) => {
    if (persistingRef.current) {
      return;
    }
    setState((prev) => {
      const present = prev.weekdaysSelected.includes(weekday);
      const next = present
        ? prev.weekdaysSelected.filter((w) => w !== weekday)
        : [...prev.weekdaysSelected, weekday];
      return { ...prev, weekdaysSelected: next };
    });
  }, []);

  const selectAllDays = useCallback(() => {
    if (persistingRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, weekdaysSelected: [...weekdays] }));
  }, []);

  const setHour = useCallback((hour24: number) => {
    if (persistingRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, hourSelected: hour24 }));
  }, []);

  const setMinute = useCallback((minute: number) => {
    if (persistingRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, minuteSelected: minute }));
  }, []);

  const setTask = useCallback((task: TaskType) => {
    if (persistingRef.current) {
      return;
    }
    setState((prev) => ({
      ...prev,
      taskSelected: task,
      taskSelectorExpanded: false,
    }));
  }, []);

  const setRounds = useCallback((rounds: number) => {
    if (persistingRef.current) {
      return;
    }
    const clamped = Math.max(1, Math.min(5, Math.round(rounds)));
    setState((prev) => ({ ...prev, roundsSelected: clamped }));
  }, []);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    if (persistingRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, difficultySelected: difficulty }));
  }, []);

  const toggleSnooze = useCallback(() => {
    if (persistingRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, snoozeEnabled: !prev.snoozeEnabled }));
  }, []);

  const expandTaskSelector = useCallback((expanded: boolean) => {
    if (persistingRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, taskSelectorExpanded: expanded }));
  }, []);

  const pickSound = useCallback(() => {
    if (persistingRef.current) {
      return;
    }
    pickGenerationRef.current += 1;
    const gen = pickGenerationRef.current;
    const pick = async () => {
      try {
        const selection = await pickAlarmSoundFromDevice();
        if (disposedRef.current) {
          if (selection) {
            deleteCustomSoundFile(selection.alarmSoundUri);
          }
          return;
        }
        if (pickGenerationRef.current !== gen || persistingRef.current) {
          if (selection) {
            deleteCustomSoundFile(selection.alarmSoundUri);
          }
          return;
        }
        if (!selection) {
          return;
        }
        const previousUri = stagedFileUriRef.current;
        if (previousUri && previousUri !== selection.alarmSoundUri) {
          deleteCustomSoundFile(previousUri);
        }
        stagedFileUriRef.current = selection.alarmSoundUri;
        saveGenerationRef.current += 1;
        setState((prev) => ({ ...prev, ...selection }));
      } catch (e) {
        console.error("pickAlarmSoundFromDevice failed", e);
        if (!disposedRef.current) {
          Alert.alert(
            "Error",
            "Could not select the audio file. Please try again.",
          );
        }
      }
    };
    void pick();
  }, []);

  const setToDefault = useCallback(() => {
    if (persistingRef.current) {
      return;
    }
    if (stagedFileUriRef.current) {
      deleteCustomSoundFile(stagedFileUriRef.current);
      stagedFileUriRef.current = null;
    }
    saveGenerationRef.current += 1;
    pickGenerationRef.current += 1;
    setState((prev) => ({ ...prev, ...defaultSoundSelection() }));
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
    if (persistingRef.current) {
      return;
    }
    const draft = buildDraft();
    const store = useAlarmStore.getState();
    const conflict = findConflictingAlarm(
      store.alarms,
      draft,
      state.alarmId ?? undefined,
    );
    if (conflict) {
      Alert.alert(
        "Alarm already set",
        `An alarm with the same time (${formatTime(draft.hour, draft.minute)}) has already been set.`,
      );
      return;
    }
    persistingRef.current = true;
    pickGenerationRef.current += 1;
    setState((prev) => ({ ...prev, saving: true }));
    const previousSound =
      state.alarmId != null
        ? (store.alarms.find((a) => a.id === state.alarmId)?.sound ?? null)
        : null;
    const saveGen = saveGenerationRef.current;
    const pendingSoundUri = stagedFileUriRef.current;
    stagedFileUriRef.current = null;
    const persist = async () => {
      try {
        let alarm: Alarm;
        if (state.alarmId != null) {
          alarm = { id: state.alarmId, ...draft };
          await store.updateAlarm(alarm);
          if (
            previousSound !== alarm.sound &&
            !isDefaultSound(previousSound) &&
            !isSoundFileReferenced(previousSound)
          ) {
            deleteCustomSoundFile(previousSound);
          }
        } else {
          const id = await store.insertAlarm(draft);
          alarm = { id, ...draft };
        }
        try {
          await setAlarm(alarm);
        } catch (schedErr) {
          console.error("setAlarm failed (alarm still saved)", schedErr);
        }
        if (!disposedRef.current) {
          router.back();
        }
      } catch (e) {
        console.error("persistAlarm failed", e);
        if (!disposedRef.current) {
          Alert.alert("Error", "Could not save the alarm. Please try again.");
        }
        if (pendingSoundUri) {
          if (!disposedRef.current && saveGenerationRef.current === saveGen) {
            stagedFileUriRef.current = pendingSoundUri;
          } else {
            deleteCustomSoundFile(pendingSoundUri);
          }
        }
      } finally {
        persistingRef.current = false;
        if (!disposedRef.current) {
          setState((prev) => ({ ...prev, saving: false }));
        }
      }
    };
    void persist();
  }, [buildDraft, router, state.alarmId]);

  const handleCancel = useCallback(() => {
    if (persistingRef.current) {
      return;
    }
    if (stagedFileUriRef.current) {
      deleteCustomSoundFile(stagedFileUriRef.current);
      stagedFileUriRef.current = null;
    }
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
    setToDefault,
    toggleSnooze,
    expandTaskSelector,
    buildDraft,
    handleConfirm,
    handleCancel,
    reset,
  };
}
