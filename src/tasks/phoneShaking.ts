export const G_MS2 = 9.81;
export const SHAKE_THRESHOLD_MS2 = 11;
export const SHAKE_INTENSITY_MULTIPLIER = 2;
export const THRESHOLD_G =
  (SHAKE_THRESHOLD_MS2 * SHAKE_INTENSITY_MULTIPLIER) / G_MS2;
export const SHAKE_TIMEOUT_MS = 150;
export const UPDATE_INTERVAL_MS = 100;
export const INITIAL_SHAKE_MIN = 15;
export const INITIAL_SHAKE_MAX = 30;

export function generateInitialShakeCount(): number {
  return (
    INITIAL_SHAKE_MIN +
    Math.floor(Math.random() * (INITIAL_SHAKE_MAX - INITIAL_SHAKE_MIN + 1))
  );
}

export function computeMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export function isShake(
  magnitude: number,
  lastShakeTimeMs: number,
  nowMs: number,
): boolean {
  return magnitude > THRESHOLD_G && nowMs - lastShakeTimeMs > SHAKE_TIMEOUT_MS;
}
