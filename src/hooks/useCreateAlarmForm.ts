import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { weekdays } from "@/data/constants";
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
  alarmId: number | null;
  weekdaysSelected: Weekday[];
  hourSelected: number;
  minuteSelected: number;
  taskSelected: TaskType;
  roundsSelected: number;
  difficultySelected: Difficulty;
  alarmSoundSelected: string;
  alarmSoundUri: string;
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
  buildAlarm: () => Alarm;
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
  alarmSoundUri: "Default",
  snoozeEnabled: true,
  taskSelectorExpanded: false,
  enabled: true,
};

function isTaskConfigurable(task: TaskType): boolean {
  return task !== "Shake phone" && task !== "None";
}

function fromAlarm(alarm: Alarm): Omit<CreateAlarmUiState, "alarmId"> {
  const isCustom = alarm.sound !== "Default";
  return {
    weekdaysSelected: [...alarm.days],
    hourSelected: alarm.hour,
    minuteSelected: alarm.minute,
    taskSelected: alarm.task,
    roundsSelected: alarm.rounds,
    difficultySelected: alarm.difficulty,
    alarmSoundSelected: isCustom ? alarm.sound : "Default",
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
    // ═══ PLACEHOLDER: pickSound ═══════════════════════════════════════
    // What:    Open the audio picker, copy the file into the sandbox, store a
    //          stable file:// URI + human-readable display name.
    // Stubbed: UI-only pass — expo-document-picker / expo-file-system not installed.
    // Spec:    docs/06 §2.1–§2.3 (picker + display-name + persistence bug fix),
    //          docs/07 §1 (audio picking row), AGENTS.md #6 (copy-to-sandbox fix).
    // Implement:
    //   1. const res = await DocumentPicker.getDocumentAsync({ type: "audio/*",
    //        copyToCacheDirectory: true })
    //   2. if (res.canceled || !res.assets?.[0]) return
    //   3. const asset = res.assets[0]
    //   4. const dest = FileSystem.documentDirectory + `alarms/${asset.name}`
    //   5. await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + "alarms/", { intermediates: true })
    //   6. await FileSystem.copyAsync({ from: asset.uri, to: dest })
    //        // sandbox copy fixes the persisted-URI bug (doc 06 §2.3):
    //        // content URIs are not usable across process restarts
    //   7. setAlarmSoundUri(dest)              // store file:// URI, NOT the content URI
    //   8. setAlarmSoundSelected(asset.name)   // display name for the form label
    //   9. Persist only `dest` into Alarm.sound at confirm time
    // API:     pickSound(): Promise<void>
    // Returns: void  (updates alarmSoundSelected + alarmSoundUri state)
    // ═══════════════════════════════════════════════════════════════════
  }, []);

  const buildAlarm = useCallback((): Alarm => {
    // ═══ PLACEHOLDER: new-alarm id ════════════════════════════════════
    // What:    The Alarm.id for a newly created alarm.
    // Stubbed: No DB auto-increment yet.
    // Spec:    docs/02 §1 (id auto-increment PK), docs/07 §5 (data model),
    //          AGENTS.md "id (auto-increment)".
    // Implement:
    //   1. Do NOT assign id client-side. Omit it from the draft passed to
    //        alarmStore.insertAlarm; let the DB return the real auto-increment id.
    //   2. Use the returned id for AlarmScheduler.rescheduleWeekly (see Seam 1).
    // Temporary: id: Date.now()  (in-memory only; discarded on persist).
    // ═══════════════════════════════════════════════════════════════════
    return {
      id: state.alarmId ?? Date.now(),
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
    // ═══ PLACEHOLDER: persistAlarm ═════════════════════════════════════
    // What:    Persist the draft alarm and re-arm the OS schedule.
    // Stubbed: UI-only pass — no DB layer (alarmStore) or AlarmScheduler yet.
    // Spec:    docs/04 §5.3 (Confirm), docs/07 §2.1 + §4, AGENTS.md #4/#5.
    // Implement (EDIT — alarmId != null):
    //   1. const old = await alarmStore.getAlarmById(draft.id)
    //   2. await AlarmScheduler.cancelAllForAlarm(draft.id)   // cancel old weekday requests
    //   3. await alarmStore.updateAlarm(draft)                // mutate + persist fields
    //   4. await AlarmScheduler.rescheduleWeekly(draft)       // re-arm per weekday,
    //        // identifier scheme: `${alarmId}${weekday}`.hashCode()  (AGENTS.md #5)
    // Implement (CREATE — alarmId == null):
    //   1. const id = await alarmStore.insertAlarm({ ...draft, enabled: true })
    //        // id is the DB auto-increment PK — do NOT generate client-side
    //   2. await AlarmScheduler.rescheduleWeekly({ ...draft, id })
    // Final:   router.back()   // do NOT call reset() before navigating — the
    //        // screen unmounts on back, and a synchronous state update during
    //        // the slide_from_right transition causes "child already has a
    //        // parent" native view errors. Local state is discarded on unmount.
    // API:     persistAlarm(draft: Alarm): Promise<void>
    // Returns: void
    // ═══════════════════════════════════════════════════════════════════
    void buildAlarm;
    router.back();
  }, [buildAlarm, router]);

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
    buildAlarm,
    handleConfirm,
    handleCancel,
    reset,
  };
}
