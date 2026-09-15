const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = process.cwd();
const NATIVE_DIR = path.join(ROOT, "native");
const MODULE_PROJECT = "alarm-scheduler";

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function hasPlatform(platform) {
  switch (platform) {
    case "android":
      return fs.existsSync(path.join(NATIVE_DIR, "android"));
    case "ios":
      return fs.existsSync(path.join(NATIVE_DIR, "ios"));
    default:
      return false;
  }
}

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), "Library", "Android", "sdk"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "platform-tools"))) {
      return candidate;
    }
  }
  return null;
}

function writeLocalProperties() {
  const sdk = findAndroidSdk();
  const androidDir = path.join(ROOT, "android");
  if (!sdk) {
    console.warn(
      "[android] Could not locate Android SDK. Set ANDROID_HOME or install the SDK at ~/Library/Android/sdk.",
    );
    return;
  }
  const localPropsPath = path.join(androidDir, "local.properties");
  fs.writeFileSync(localPropsPath, `sdk.dir=${sdk}\n`);
  console.log(`[android] Wrote ${localPropsPath} (sdk.dir=${sdk})`);
}

function prebuild(platform) {
  console.log(`\n[prebuild] Running expo prebuild --platform ${platform}...`);
  run(`npx expo prebuild --platform ${platform} --no-install`);
  if (platform === "android") {
    writeLocalProperties();
  }
}

function buildAndroid() {
  const androidDir = path.join(ROOT, "android");
  if (!fs.existsSync(androidDir)) {
    console.log("android/ directory not found; running prebuild first...");
    prebuild("android");
  } else if (!fs.existsSync(path.join(androidDir, "local.properties"))) {
    writeLocalProperties();
  }

  const gradlew =
    process.platform === "win32"
      ? path.join(androidDir, "gradlew.bat")
      : path.join(androidDir, "gradlew");

  if (!fs.existsSync(gradlew)) {
    console.error(
      `Gradle wrapper not found at ${gradlew}. Run 'npx expo prebuild' first.`,
    );
    process.exit(1);
  }

  console.log(`\n[build:android] Compiling ${MODULE_PROJECT}...`);
  run(`${gradlew} :${MODULE_PROJECT}:assembleRelease`, { cwd: androidDir });
}

function buildIos() {
  const iosDir = path.join(ROOT, "ios");
  if (!fs.existsSync(iosDir)) {
    console.log("ios/ directory not found; running prebuild first...");
    prebuild("ios");
  }

  const podfile = path.join(iosDir, "Podfile");
  if (!fs.existsSync(podfile)) {
    console.error(
      `Podfile not found at ${podfile}. Run 'npx expo prebuild' first.`,
    );
    process.exit(1);
  }

  console.log("\n[build:ios] Running pod install...");
  run("pod install", { cwd: iosDir });

  console.log(
    "\n[build:ios] Pod install complete. Run 'npx expo run:ios' to build the full app.",
  );
}

const platform = process.argv[2] || "all";

if (!["android", "ios", "all"].includes(platform)) {
  console.error("Usage: node scripts/build-native-module.js [android|ios|all]");
  process.exit(1);
}

if (!fs.existsSync(NATIVE_DIR)) {
  console.error(`Native module directory not found: ${NATIVE_DIR}`);
  process.exit(1);
}

const platforms = platform === "all" ? ["android", "ios"] : [platform];

for (const p of platforms) {
  if (!hasPlatform(p)) {
    console.warn(`Skipping ${p}: no native/${p} source directory found.`);
    continue;
  }

  console.log(`\n=== Building alarm-scheduler native module for ${p} ===`);

  try {
    if (p === "android") {
      buildAndroid();
    } else if (p === "ios") {
      buildIos();
    }
    console.log(`[${p}] Done.`);
  } catch (err) {
    console.error(`[${p}] Build failed:`, err.message);
    process.exit(1);
  }
}

console.log("\nNative module build complete.");
