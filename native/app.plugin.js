const {
  withAndroidManifest,
  withInfoPlist,
  createRunOncePlugin,
} = require("expo/config-plugins");

const pkg = require("./package.json");

const ANDROID_PERMISSIONS = [
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.USE_EXACT_ALARM",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.VIBRATE",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.WAKE_LOCK",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
];

function withAlarmSchedulerIos(config) {
  return withInfoPlist(config, (mod) => {
    const modes = mod.modResults.UIBackgroundModes || [];
    if (!modes.includes("audio")) {
      modes.push("audio");
    }
    mod.modResults.UIBackgroundModes = modes;
    return mod;
  });
}

function withAlarmSchedulerAndroid(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = manifest["uses-permission"] || [];
    for (const name of ANDROID_PERMISSIONS) {
      const exists = permissions.some(
        (p) => p && p.$ && p.$["android:name"] === name,
      );
      if (!exists) {
        permissions.push({ $: { "android:name": name } });
      }
    }
    manifest["uses-permission"] = permissions;
    return mod;
  });
}

const withAlarmScheduler = (config) => {
  config = withAlarmSchedulerIos(config);
  config = withAlarmSchedulerAndroid(config);
  return config;
};

module.exports = createRunOncePlugin(withAlarmScheduler, pkg.name, pkg.version);
