#!/usr/bin/env node

import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { getKiroAvailability, getKiroAuthStatus, runKiroDoctor, runKiroChat, runKiroTranslate } from "./lib/kiro.mjs";
import {
  generateJobId, upsertJob, listJobs, getJob,
  writeJobFile, readJobFile, writeJobOutput, readJobOutput,
  resolveWorkspaceRoot, resolveJobLogFile,
} from "./lib/state.mjs";
import { runProcess, terminateProcessTree } from "./lib/process.mjs";
import { renderSetupReport, renderStatusTable, renderJobDetail, renderCancelReport } from "./lib/render.mjs";

const SESSION_ID_ENV = "KIRO_COMPANION_SESSION_ID";
const ROOT_DIR = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

function getSessionId() {
  return process.env[SESSION_ID_ENV] ?? null;
}

function nowIso() {
  return new Date().toISOString();
}

function outputResult(value, asJson) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    process.stdout.write(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    process.stdout.write("\n");
  }
}

function shorten(text, limit = 96) {
  const normalized = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

function splitRawArgumentString(raw) {
  const tokens = [];
  let current = "";
  for (const ch of raw) {
    if (ch === " " || ch === "\t") {
      if (current) { tokens.push(current); current = ""; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function normalizeArgv(argv) {
  if (argv.length === 1 && argv[0] && argv[0].includes(" ")) {
    return splitRawArgumentString(argv[0]);
  }
  return argv;
}

function parseFlags(argv, config = {}) {
  const args = normalizeArgv([...argv]);
  const options = {};
  const positionals = [];
  const valueOpts = new Set(config.valueOptions ?? []);
  const boolOpts = new Set(config.booleanOptions ?? []);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (boolOpts.has(key)) {
      options[key] = true;
    } else if (valueOpts.has(key) && i + 1 < args.length) {
      options[key] = args[++i];
    } else {
      positionals.push(arg);
    }
  }
  return { options, positionals };
}

function filterJobsBySession(jobs) {
  const sessionId = getSessionId();
  if (!sessionId) return jobs;
  return jobs.filter((j) => j.sessionId === sessionId);
}

function sortNewestFirst(jobs) {
  return [...jobs].sort((a, b) =>
    String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? ""))
  );
}

// --- Handlers ---

async function handleSetup(argv) {
  const { options } = parseFlags(argv, { booleanOptions: ["json"] });

  const kiroCli = await getKiroAvailability();
  let auth = { loggedIn: false };
  let doctor = { ok: false };

  if (kiroCli.available) {
    [auth, doctor] = await Promise.all([
      getKiroAuthStatus(),
      runKiroDoctor(),
    ]);
  }

  const report = {
    ready: kiroCli.available && auth.loggedIn,
    kiroCli,
    auth,
    doctor,
  };

  if (options.json) {
    outputResult(report, true);
  } else {
    outputResult(renderSetupReport(report), false);
  }
}

async function handleChat(argv) {
  const { options, positionals } = parseFlags(argv, {
    valueOptions: ["agent", "resume-id"],
    booleanOptions: ["background", "wait", "no-trust-all-tools", "resume"],
  });

  const cwd = process.cwd();
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  const prompt = positionals.join(" ").trim();

  if (!prompt) {
    console.error("Error: No prompt provided. Usage: kiro-companion.mjs chat <prompt>");
    process.exit(1);
  }

  const kiroCli = await getKiroAvailability();
  if (!kiroCli.available) {
    console.error("Error: kiro-cli is not installed. Run /kiro:setup first.");
    process.exit(1);
  }

  const jobId = generateJobId("chat");
  const job = {
    id: jobId,
    type: "chat",
    jobClass: "chat",
    status: "running",
    phase: "starting",
    title: "Kiro Chat",
    summary: shorten(prompt),
    prompt: prompt.slice(0, 200),
    sessionId: getSessionId(),
    startedAt: nowIso(),
    pid: null,
  };

  // Background execution: queue and spawn detached worker
  if (options.background) {
    job.status = "queued";
    job.phase = "queued";
    upsertJob(workspaceRoot, job);
    writeJobFile(workspaceRoot, jobId, { ...job, request: { prompt, options } });

    const scriptPath = path.join(ROOT_DIR, "scripts", "kiro-companion.mjs");
    const child = spawn(process.execPath, [scriptPath, "chat-worker", "--job-id", jobId], {
      cwd,
      env: process.env,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();

    upsertJob(workspaceRoot, { id: jobId, pid: child.pid ?? null });
    console.log(`Kiro chat started in the background as ${jobId}. Check /kiro:status ${jobId} for progress.`);
    return;
  }

  // Foreground execution
  upsertJob(workspaceRoot, job);

  const result = await runKiroChat(prompt, {
    cwd,
    agent: options.agent ?? null,
    trustAllTools: !options["no-trust-all-tools"],
    resume: options.resume ?? false,
    resumeId: options["resume-id"] ?? null,
  });

  const completionStatus = result.exitCode === 0 ? "completed" : "failed";
  const completedAt = nowIso();

  upsertJob(workspaceRoot, {
    id: jobId,
    status: completionStatus,
    phase: completionStatus === "completed" ? "done" : "failed",
    finishedAt: completedAt,
    exitCode: result.exitCode,
    pid: null,
    ...(result.exitCode !== 0 ? { error: result.stderr.trim().slice(0, 500) } : {}),
  });

  const output = result.stdout || result.stderr;
  if (output) {
    writeJobOutput(workspaceRoot, jobId, output);
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.exitCode !== 0 && result.stderr) {
    process.stderr.write(result.stderr);
  }

  process.exitCode = result.exitCode;
}

async function handleChatWorker(argv) {
  const { options } = parseFlags(argv, { valueOptions: ["job-id"] });
  const jobId = options["job-id"];
  if (!jobId) {
    throw new Error("Missing required --job-id for chat-worker.");
  }

  const cwd = process.cwd();
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  const stored = readJobFile(workspaceRoot, jobId);
  if (!stored || !stored.request) {
    throw new Error(`No stored job found for ${jobId}.`);
  }

  const { prompt, options: reqOpts } = stored.request;

  upsertJob(workspaceRoot, {
    id: jobId,
    status: "running",
    phase: "running",
    startedAt: nowIso(),
    pid: process.pid,
  });

  try {
    const result = await runKiroChat(prompt, {
      cwd,
      agent: reqOpts.agent ?? null,
      trustAllTools: !reqOpts["no-trust-all-tools"],
      resume: reqOpts.resume ?? false,
      resumeId: reqOpts["resume-id"] ?? null,
    });

    const completionStatus = result.exitCode === 0 ? "completed" : "failed";
    const completedAt = nowIso();

    upsertJob(workspaceRoot, {
      id: jobId,
      status: completionStatus,
      phase: completionStatus === "completed" ? "done" : "failed",
      finishedAt: completedAt,
      exitCode: result.exitCode,
      pid: null,
      ...(result.exitCode !== 0 ? { error: result.stderr.trim().slice(0, 500) } : {}),
    });

    const output = result.stdout || result.stderr;
    if (output) {
      writeJobOutput(workspaceRoot, jobId, output);
    }

    writeJobFile(workspaceRoot, jobId, {
      ...stored,
      status: completionStatus,
      finishedAt: completedAt,
      rendered: output,
    });
  } catch (err) {
    upsertJob(workspaceRoot, {
      id: jobId,
      status: "failed",
      phase: "failed",
      finishedAt: nowIso(),
      pid: null,
      error: err.message,
    });
    throw err;
  }
}

async function handleTranslate(argv) {
  const input = normalizeArgv(argv).join(" ").trim();
  if (!input) {
    console.error("Error: No input provided. Usage: kiro-companion.mjs translate <description>");
    process.exit(1);
  }

  const result = await runKiroTranslate(input, { cwd: process.cwd() });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.exitCode !== 0 && result.stderr) {
    process.stderr.write(result.stderr);
  }

  process.exitCode = result.exitCode;
}

function handleStatus(argv) {
  const { options, positionals } = parseFlags(argv, {
    booleanOptions: ["json", "all"],
  });

  const cwd = process.cwd();
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  const jobId = positionals[0];

  if (jobId) {
    const job = getJob(workspaceRoot, jobId);
    if (!job) {
      console.error(`Job ${jobId} not found.`);
      process.exit(1);
    }
    outputResult(options.json ? job : renderJobDetail(job), options.json);
    return;
  }

  let jobs = listJobs(workspaceRoot);
  if (!options.all) {
    jobs = filterJobsBySession(jobs);
  }
  jobs = sortNewestFirst(jobs);

  outputResult(options.json ? jobs : renderStatusTable(jobs), options.json);
}

function handleResult(argv) {
  const { options, positionals } = parseFlags(argv, {
    booleanOptions: ["json"],
  });

  const cwd = process.cwd();
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  let jobId = positionals[0];

  if (!jobId) {
    const jobs = sortNewestFirst(filterJobsBySession(listJobs(workspaceRoot)));
    const completed = jobs.find((j) => j.status === "completed");
    if (!completed) {
      console.error("No completed jobs found.");
      process.exit(1);
    }
    jobId = completed.id;
  }

  const job = getJob(workspaceRoot, jobId);
  if (!job) {
    console.error(`Job ${jobId} not found.`);
    process.exit(1);
  }

  const output = readJobOutput(workspaceRoot, jobId);

  if (options.json) {
    outputResult({ job, output }, true);
  } else {
    outputResult(renderJobDetail(job), false);
    if (output) {
      console.log("\n---\n");
      process.stdout.write(output);
    } else {
      console.log("\nNo output stored for this job.");
    }
  }
}

function handleCancel(argv) {
  const { options, positionals } = parseFlags(argv, {
    booleanOptions: ["json"],
  });

  const cwd = process.cwd();
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  let jobId = positionals[0];

  if (!jobId) {
    const jobs = sortNewestFirst(filterJobsBySession(listJobs(workspaceRoot)));
    const running = jobs.find((j) => j.status === "running" || j.status === "queued");
    if (!running) {
      outputResult(options.json ? { cancelled: false, reason: "no active job" } : renderCancelReport(null), options.json);
      return;
    }
    jobId = running.id;
  }

  const job = getJob(workspaceRoot, jobId);
  if (!job) {
    console.error(`Job ${jobId} not found.`);
    process.exit(1);
  }

  if (job.status !== "running" && job.status !== "queued") {
    console.log(`Job ${jobId} is already ${job.status}.`);
    return;
  }

  if (job.pid) {
    terminateProcessTree(job.pid);
  }

  const completedAt = nowIso();
  upsertJob(workspaceRoot, {
    id: jobId,
    status: "cancelled",
    phase: "cancelled",
    finishedAt: completedAt,
    pid: null,
    error: "Cancelled by user.",
  });

  const updatedJob = { ...job, status: "cancelled", finishedAt: completedAt };
  const payload = { cancelled: true, jobId, title: job.title };
  outputResult(options.json ? payload : renderCancelReport(updatedJob), options.json);
}

async function handleReview(argv) {
  const { options } = parseFlags(argv, {
    valueOptions: ["base"],
    booleanOptions: ["background", "wait"],
  });

  const cwd = process.cwd();

  // Build diff
  let diff = "";
  if (options.base) {
    const result = await runProcess("git", ["diff", `${options.base}...HEAD`], { cwd });
    diff = result.stdout;
  } else {
    const result = await runProcess("git", ["diff", "HEAD"], { cwd });
    diff = result.stdout;
    if (!diff.trim()) {
      // Fall back to latest commit diff; ignore errors (e.g. initial commit)
      try {
        const fallback = await runProcess("git", ["diff", "HEAD~1"], { cwd });
        if (fallback.exitCode === 0) diff = fallback.stdout;
      } catch {
        // HEAD~1 does not exist (initial commit) — leave diff empty
      }
    }
  }

  if (!diff.trim()) {
    console.log("No changes to review.");
    return;
  }

  // Truncate at a newline boundary to avoid cutting multi-byte characters
  const MAX_DIFF = 100_000;
  let diffText = diff;
  if (diff.length > MAX_DIFF) {
    const cutoff = diff.lastIndexOf("\n", MAX_DIFF);
    diffText = (cutoff > 0 ? diff.slice(0, cutoff) : diff.slice(0, MAX_DIFF)) + "\n\n... (diff truncated)";
  }

  const prompt = [
    "Review the following code changes. Point out bugs, security issues, performance problems, and readability concerns.",
    "Be specific with file paths and line references.",
    "",
    "```diff",
    diffText,
    "```",
  ].join("\n");

  // Reuse handleChat logic by building a synthetic argv
  const chatArgv = [];
  if (options.background) chatArgv.push("--background");
  if (options.wait) chatArgv.push("--wait");
  chatArgv.push(prompt);

  return handleChat(chatArgv);
}

// --- Dispatcher ---

const [subcommand, ...argv] = process.argv.slice(2);

const handlers = {
  setup: handleSetup,
  chat: handleChat,
  "chat-worker": handleChatWorker,
  translate: handleTranslate,
  status: handleStatus,
  result: handleResult,
  cancel: handleCancel,
  review: handleReview,
};

const handler = handlers[subcommand];
if (!handler) {
  const available = Object.keys(handlers).filter((k) => k !== "chat-worker").join(", ");
  console.error(`Unknown subcommand: ${subcommand}`);
  console.error(`Available: ${available}`);
  process.exit(1);
}

Promise.resolve(handler(argv)).catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
