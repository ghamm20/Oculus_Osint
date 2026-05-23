import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { join } from "node:path";

const rootDir = process.cwd();
const standaloneDir = join(rootDir, ".next", "standalone");
const serverPath = join(standaloneDir, "server.js");

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
