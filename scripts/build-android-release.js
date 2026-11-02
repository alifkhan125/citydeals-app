const { spawnSync } = require("node:child_process");
const path = require("node:path");

const androidDirectory = path.join(path.dirname(require.resolve("../package.json")), "android");

function runGradle(task) {
  const args = [task, "--console=plain", "--max-workers=2"];
  const command = process.platform === "win32" ? "cmd.exe" : "./gradlew";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/c", "gradlew.bat", ...args]
    : args;
  const result = spawnSync(command, commandArgs, {
    cwd: androidDirectory,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Publish native headers/libraries before configuring their consumers. Keeping
// this in a separate invocation also repairs missing prefab outputs after clean.
runGradle(":react-native-reanimated:prefabReleasePackage");
runGradle(":app:assembleRelease");
