import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const cwd = process.cwd();
const configPath = path.join(cwd, "agent-browser.json");
const localBinary = path.join(cwd, "node_modules", ".bin", "agent-browser");

async function resolveBinary() {
  try {
    await access(localBinary);
    return localBinary;
  } catch {
    return "agent-browser";
  }
}

const binary = await resolveBinary();
const forwardedArgs = process.argv.slice(2);
const args = ["--config", configPath, ...(forwardedArgs[0] === "--" ? forwardedArgs.slice(1) : forwardedArgs)];

const child = spawn(binary, args, {
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
  console.error(`Unable to launch agent-browser: ${error.message}`);
  console.error("Install it globally with Homebrew or npm, or add it locally to Source/node_modules.");
  process.exit(1);
});
