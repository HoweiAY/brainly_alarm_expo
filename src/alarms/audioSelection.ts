export const DEFAULT_SOUND_LABEL = "Default";

export interface SoundSelection {
  alarmSoundSelected: string;
  alarmSoundUri: string | null;
}

export function isDefaultSound(soundUri: string | null): boolean {
  return soundUri == null || soundUri === "";
}

export function defaultSoundSelection(): SoundSelection {
  return {
    alarmSoundSelected: DEFAULT_SOUND_LABEL,
    alarmSoundUri: null,
  };
}

const UNIQUE_PREFIX_PATTERN = /^\d+_/;

function decodeFileName(basename: string): string {
  try {
    return decodeURIComponent(basename);
  } catch {
    return basename;
  }
}

export function soundLabelFor(soundUri: string | null): string {
  if (isDefaultSound(soundUri)) {
    return DEFAULT_SOUND_LABEL;
  }
  const uri = soundUri as string;
  const slashIndex = uri.lastIndexOf("/");
  const basename = slashIndex >= 0 ? uri.slice(slashIndex + 1) : uri;
  if (basename.length === 0) {
    return uri;
  }
  return decodeFileName(basename).replace(UNIQUE_PREFIX_PATTERN, "");
}

let fileNameCounter = 0;

export function sanitizeAudioFileName(name: string | null | undefined): string {
  const base = (name ?? "")
    .replace(/[\\/]+/g, "_")
    .replace(/\.\./g, "_")
    .trim();
  const extMatch = base.match(/(\.[A-Za-z0-9]+)$/);
  const stem = extMatch ? base.slice(0, -extMatch[1].length) : base;
  const ext = extMatch ? extMatch[1] : "";
  const safeStem = stem.length > 0 ? stem : "alarm_sound";
  const unique = `${Date.now()}${fileNameCounter++}`;
  return `${unique}_${safeStem}${ext}`;
}

export function buildSoundSelection(
  name: string | undefined,
  uri: string,
): SoundSelection {
  const trimmed = name?.trim();
  return {
    alarmSoundSelected:
      trimmed && trimmed.length > 0 ? trimmed : soundLabelFor(uri),
    alarmSoundUri: uri,
  };
}
