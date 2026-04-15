import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const localBinary = path.join(cwd, "node_modules", ".bin", "playwright");
const args = process.argv.slice(2);

try {
  await access(localBinary);
} catch {
  console.error("Playwright is scaffolded in this repo but not installed locally yet.");
  console.error("When network/package access is available, run:");
  console.error("  pnpm add -D @playwright/test");
  console.error("  pnpm exec playwright install chromium webkit");
  process.exit(1);
}

const child = spawn(localBinary, args, {
  cwd,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Unable to launch Playwright: ${error.message}`);
  process.exit(1);
});
