import { binaryAvailable, runProcess } from "./process.mjs";

const KIRO_CLI = "kiro-cli";

/**
 * Check if kiro-cli is available and return version info.
 */
export async function getKiroAvailability() {
  const result = await binaryAvailable(KIRO_CLI, ["--version"]);
  if (!result.available) {
    return { available: false, error: result.error };
  }
  const version = result.output.replace(/^kiro-cli\s*/i, "").trim();
  return { available: true, version };
}

/**
 * Check authentication status via `kiro-cli whoami`.
 */
export async function getKiroAuthStatus() {
  try {
    const result = await runProcess(KIRO_CLI, ["whoami"], { timeout: 15_000 });
    if (result.exitCode === 0) {
      return { loggedIn: true, output: result.stdout.trim() };
    }
    return { loggedIn: false, error: result.stderr.trim() || result.stdout.trim() };
  } catch (err) {
    return { loggedIn: false, error: err.message };
  }
}

/**
 * Run `kiro-cli doctor` to check system health.
 */
export async function runKiroDoctor() {
  try {
    const result = await runProcess(KIRO_CLI, ["doctor"], { timeout: 30_000 });
    return { ok: result.exitCode === 0, output: result.stdout.trim(), error: result.stderr.trim() };
  } catch (err) {
    return { ok: false, output: "", error: err.message };
  }
}

/**
 * Run `kiro-cli chat --no-interactive` with the given prompt.
 * Returns { exitCode, stdout, stderr, pid }.
 */
export async function runKiroChat(prompt, options = {}) {
  const args = ["chat", "--no-interactive"];

  if (options.trustAllTools !== false) {
    args.push("--trust-all-tools");
  }
  if (options.agent) {
    args.push("--agent", options.agent);
  }
  if (options.resumeId) {
    args.push("--resume-id", options.resumeId);
  } else if (options.resume) {
    args.push("--resume");
  }

  args.push(prompt);

  return runProcess(KIRO_CLI, args, {
    cwd: options.cwd,
    timeout: options.timeout ?? 600_000,
  });
}

/**
 * Run `kiro-cli translate` with the given text.
 */
export async function runKiroTranslate(input, options = {}) {
  const args = ["translate"];
  return runProcess(KIRO_CLI, args, {
    cwd: options.cwd,
    timeout: options.timeout ?? 30_000,
    stdin: input,
  });
}
