import dayjs from "dayjs";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  UPDATE_INTERVAL_MS,
  computeMagnitude,
  generateInitialShakeCount,
  getShakeProgress,
  isShake,
} from "./phoneShaking";

export interface UsePhoneShakingOptions {
  onComplete: () => void;
}

export interface UsePhoneShakingResult {
  remainingShakes: number;
  totalShakes: number;
  progress: number;
}

export function usePhoneShaking({
  onComplete,
}: UsePhoneShakingOptions): UsePhoneShakingResult {
  const [totalShakes] = useState<number>(() => generateInitialShakeCount());
  const [remainingShakes, setRemainingShakes] = useState<number>(totalShakes);

  const remainingRef = useRef<number>(remainingShakes);
  const lastShakeTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);
  const cancelledRef = useRef<boolean>(false);
  const onCompleteRef = useRef<() => void>(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (cancelledRef.current || completedRef.current) return;
      const mag = computeMagnitude(x, y, z);
      const now = dayjs().valueOf();
      if (!isShake(mag, lastShakeTimeRef.current, now)) return;
      lastShakeTimeRef.current = now;
      remainingRef.current = Math.max(0, remainingRef.current - 1);
      setRemainingShakes(remainingRef.current);
      if (remainingRef.current === 0) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    });
    return () => {
      cancelledRef.current = true;
      sub.remove();
    };
  }, []);

  return {
    remainingShakes,
    totalShakes,
    progress: getShakeProgress(remainingShakes, totalShakes),
  };
}
