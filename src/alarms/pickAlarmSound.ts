import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import {
  buildSoundSelection,
  sanitizeAudioFileName,
  type SoundSelection,
} from "./audioSelection";

const ALARM_SOUNDS_DIR = "alarm_sounds";

export async function pickAlarmSoundFromDevice(): Promise<SoundSelection | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    copyToCacheDirectory: true,
  });
  if (result.canceled) {
    return null;
  }
  const asset = result.assets[0];
  if (!asset) {
    return null;
  }
  const source = new File(asset.uri);
  const directory = new Directory(Paths.document, ALARM_SOUNDS_DIR);
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, sanitizeAudioFileName(asset.name));
  await source.copy(destination);
  return buildSoundSelection(asset.name, destination.uri);
}
