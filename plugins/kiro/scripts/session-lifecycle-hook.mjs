#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { listJobs, upsertJob, resolveWorkspaceRoot } from "./lib/state.mjs";
import { terminateProcessTree } from "./lib/process.mjs";

const event = process.argv[2]; // "SessionStart" or "SessionEnd"

function readHookInput() {
  // Only read stdin if piped (non-TTY) to avoid hanging
  if (process.stdin.isTTY) return {};
  try {
    const raw = fs.readFileSync(0, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function handleSessionStart(input) {
  const sessionId = input.session_id ?? `session-${Date.now()}`;
  const envFile = process.env.CLAUDE_ENV_FILE;

  if (envFile) {
    fs.appendFileSync(envFile, `export KIRO_COMPANION_SESSION_ID='${sessionId}'\n`);
  }
}

function handleSessionEnd(input) {
  const sessionId = input.session_id;
  const cwd = input.cwd ?? process.cwd();
  const workspaceRoot = resolveWorkspaceRoot(cwd);

  if (!sessionId) return;

  const jobs = listJobs(workspaceRoot);
  const running = jobs.filter((j) => j.sessionId === sessionId && (j.status === "running" || j.status === "queued"));

  for (const job of running) {
    if (job.pid) {
      terminateProcessTree(job.pid);
    }
    upsertJob(workspaceRoot, {
      id: job.id,
      status: "cancelled",
      phase: "cancelled",
      finishedAt: new Date().toISOString(),
      pid: null,
      error: "Session ended.",
    });
  }
}

const input = readHookInput();

if (event === "SessionStart") {
  handleSessionStart(input);
} else if (event === "SessionEnd") {
  handleSessionEnd(input);
}
