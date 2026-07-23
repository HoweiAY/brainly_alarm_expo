import { useEffect, useState } from "react";
import type { Alarm } from "@/data/types";
import { mockAlarms } from "@/data/mockAlarms";

export function useAlarmById(id: number | string | null | undefined) {
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
      // ═══ PLACEHOLDER: useAlarmById ════════════════════════════════════
      // What:    Load a single alarm by id, reactively, for the edit route.
      // Stubbed: UI-only pass — alarmStore (Zustand + SQLite/WatermelonDB) not built.
      // Spec:    docs/04 §5.3 (loading behavior), docs/07 §4 (alarmStore.getAlarmById),
      //          AGENTS.md #4 (centralize CRUD through the store).
      // Implement:
      //   1. Replace the mockAlarms lookup with:
      //        const alarm = useAlarmStore((s) => s.alarms.find(a => a.id === id))
      //      (reactive Zustand selector — re-renders on store changes; replaces LiveData)
      //   2. loading: drive from a one-shot `alarmStore.loadAlarms()` pending flag, or a
      //        dedicated `getAlarmById(id): Promise<Alarm|null>` if the store is async.
      //   3. Not-found (alarm === null after load): router.replace("/create-alarm")
      //        (fall back to create-new) OR router.back() — pick one and document.
      //   4. Verify returned Alarm.id matches the route id before seeding the form
      //        (doc 04 §5.3: "verifies the returned Alarm.id matches").
      // API:     useAlarmById(id: number): { alarm: Alarm | null; loading: boolean }
      // Returns: { alarm, loading }
      // ═══════════════════════════════════════════════════════════════════
      const resolved =
        id === null || id === undefined
          ? null
          : (mockAlarms.find((a) => a.id === Number(id)) ?? null);
      setAlarm(resolved);
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [id]);

  return { alarm, loading };
}
