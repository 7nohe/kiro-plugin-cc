import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Check if a binary is available in PATH and optionally run test args.
 * Returns { available, output } or { available: false, error }.
 */
export async function binaryAvailable(name, testArgs = ["--version"], options = {}) {
  try {
    const { stdout } = await execFileAsync(name, testArgs, {
      timeout: options.timeout ?? 10_000,
      env: { ...process.env, ...options.env },
    });
    return { available: true, output: stdout.trim() };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

/**
 * Spawn a process and capture stdout/stderr.
 * Returns { exitCode, stdout, stderr, pid }.
 */
export function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      timeout: options.timeout ?? 300_000,
      stdio: [options.stdin != null ? "pipe" : "ignore", "pipe", "pipe"],
    });

    const pid = child.pid;
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });

    child.on("error", (err) => reject(err));
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr, pid });
    });

    if (options.stdin != null) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }

    if (options.onSpawn) {
      options.onSpawn(child);
    }
  });
}

/**
 * Terminate a process tree by PID.
 */
export function terminateProcessTree(pid) {
  if (pid == null || Number.isNaN(pid)) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process already gone
    }
  }
}

/**
 * Read stdin if piped (non-TTY). Returns null if stdin is a TTY.
 */
export function readStdinIfPiped() {
  if (process.stdin.isTTY) return null;
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return null;
  }
}
