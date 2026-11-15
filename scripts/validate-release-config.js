const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), "utf8"));
}

function exists(filePath) {
  return fs.existsSync(path.join(root, filePath));
}

const app = readJson("app.json").expo;
const googleServices = readJson("google-services.json");
const eas = readJson("eas.json");

const androidPackage = app.android?.package;
const iosBundleId = app.ios?.bundleIdentifier;
const googlePackage =
  googleServices.client?.[0]?.client_info?.android_client_info?.package_name;

const checks = [
  {
    label: "Android package is production package",
    ok: androidPackage === "ai.citydeals.app",
    detail: androidPackage,
  },
  {
    label: "iOS bundle identifier is production identifier",
    ok: iosBundleId === "ai.citydeals.app",
    detail: iosBundleId,
  },
  {
    label: "google-services.json matches Android package",
    ok: googlePackage === androidPackage,
    detail: `${googlePackage} vs ${androidPackage}`,
  },
  {
    label: "Android versionCode exists",
    ok: Number.isInteger(app.android?.versionCode) && app.android.versionCode > 0,
    detail: app.android?.versionCode,
  },
  {
    label: "iOS buildNumber exists",
    ok: Boolean(app.ios?.buildNumber),
    detail: app.ios?.buildNumber,
  },
  {
    label: "EAS production profile exists",
    ok: Boolean(eas.build?.production),
    detail: eas.build?.production ? "found" : "missing",
  },
  {
    label: "App icon exists",
    ok: exists(app.icon),
    detail: app.icon,
  },
  {
    label: "Android adaptive foreground icon exists",
    ok: exists(app.android?.adaptiveIcon?.foregroundImage),
    detail: app.android?.adaptiveIcon?.foregroundImage,
  },
  {
    label: "Splash image exists",
    ok: exists(app.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen")?.[1]?.image),
    detail: app.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen")?.[1]?.image,
  },
];

let failed = false;
for (const check of checks) {
  const mark = check.ok ? "PASS" : "FAIL";
  console.log(`${mark} ${check.label}: ${check.detail ?? ""}`);
  if (!check.ok) failed = true;
}

if (failed) {
  console.error("\nRelease config is not ready yet.");
  process.exit(1);
}

console.log("\nRelease config looks ready.");
