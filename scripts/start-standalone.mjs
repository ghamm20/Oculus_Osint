import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { join } from "node:path";

const rootDir = process.cwd();
const standaloneDir = join(rootDir, ".next", "standalone");
const serverPath = join(standaloneDir, "server.js");

// Next.js standalone output does NOT load .env / .env.local at runtime.
// The dev-server flow handles it via Next's loader, but the standalone server
// inherits only process.env. Load both files manually so DATABASE_URL,
// AUTH_SECRET, etc. reach the spawned server.
//
// Precedence (matches Next.js dev): real process env > .env.local > .env
function loadEnvFile(file, { override } = { override: false }) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    if (key.startsWith("#")) continue;
    if (!override && process.env[key] !== undefined) continue;
    let value = match[2] ?? "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[key] = value;
  }
}
// Track which keys came from real process env, so .env.local can override
// .env but not the harness/launcher env.
const preExisting = new Set(Object.keys(process.env));
loadEnvFile(join(rootDir, ".env.local"));
// For .env, only set when neither .env.local nor real env provided a value.
const afterLocal = new Set(Object.keys(process.env));
loadEnvFile(join(rootDir, ".env"));
// Cleanup: nothing to do — loadEnvFile with override:false respects existing
// values, so the load order above is enough.
void preExisting; void afterLocal;

async function copyDir(source, target) {
  if (!existsSync(source)) return;
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
}

if (!existsSync(serverPath)) {
  console.error("Missing .next/standalone/server.js. Run `pnpm build` before `pnpm start`.");
  process.exit(1);
}

await copyDir(join(rootDir, ".next", "static"), join(standaloneDir, ".next", "static"));
await copyDir(join(rootDir, "public"), join(standaloneDir, "public"));

const child = spawn(process.execPath, [serverPath], {
  cwd: standaloneDir,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
