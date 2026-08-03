import { getAlarmScheduler } from "./AlarmScheduler";
import type { AlarmSnapshot } from "@/data/types";

export async function playAlarmSound(soundUri: string | null): Promise<void> {
  await getAlarmScheduler().playAlarmSound(soundUri);
}

export async function stopAlarmSound(): Promise<void> {
  await getAlarmScheduler().stopAlarmSound();
}

export function soundUriFromSnapshot(snapshot: AlarmSnapshot): string | null {
  return snapshot.sound === "Default" ? null : snapshot.sound;
}
