import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const command = process.argv[2];
if (!new Set(["build", "dev"]).has(command)) throw new Error("Expected build or dev.");
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)),
  command, "--webpack", ...process.argv.slice(3),
], {
  stdio: "inherit",
  env: { ...process.env, FOUNDIT_DEPLOY_TARGET: "netlify", NEXT_TELEMETRY_DISABLED: "1" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
