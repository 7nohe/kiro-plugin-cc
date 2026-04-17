import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

const STATE_VERSION = 1;
const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";
const FALLBACK_STATE_ROOT_DIR = path.join(os.tmpdir(), "kiro-companion");
const STATE_FILE_NAME = "state.json";
const JOBS_DIR_NAME = "jobs";
const MAX_JOBS = 50;

function nowIso() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    version: STATE_VERSION,
    jobs: [],
  };
}

export function resolveWorkspaceRoot(cwd) {
  return cwd ?? process.cwd();
}

export function resolveStateDir(cwd) {
  const workspaceRoot = resolveWorkspaceRoot(cwd);
  let canonicalRoot = workspaceRoot;
  try {
    canonicalRoot = fs.realpathSync.native(workspaceRoot);
  } catch {
    canonicalRoot = workspaceRoot;
  }

  const slugSource = path.basename(workspaceRoot) || "workspace";
  const slug = slugSource.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "workspace";
  const hash = createHash("sha256").update(canonicalRoot).digest("hex").slice(0, 16);
  const pluginDataDir = process.env[PLUGIN_DATA_ENV];
  const stateRoot = pluginDataDir ? path.join(pluginDataDir, "state") : FALLBACK_STATE_ROOT_DIR;
  return path.join(stateRoot, `${slug}-${hash}`);
}

function stateFilePath(cwd) {
  return path.join(resolveStateDir(cwd), STATE_FILE_NAME);
}

export function resolveJobsDir(cwd) {
  return path.join(resolveStateDir(cwd), JOBS_DIR_NAME);
}

function ensureStateDir(cwd) {
  fs.mkdirSync(resolveJobsDir(cwd), { recursive: true });
}

export function generateJobId(prefix = "job") {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function loadState(cwd) {
  const file = stateFilePath(cwd);
  if (!fs.existsSync(file)) {
    return defaultState();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      ...defaultState(),
      ...parsed,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch {
    return defaultState();
  }
}

function pruneJobs(jobs) {
  return [...jobs]
    .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))
    .slice(0, MAX_JOBS);
}

function removeFileIfExists(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

export function saveState(cwd, state) {
  const previousJobs = loadState(cwd).jobs;
  ensureStateDir(cwd);
  const nextJobs = pruneJobs(state.jobs ?? []);
  const nextState = {
    version: STATE_VERSION,
    jobs: nextJobs,
  };

  const retainedIds = new Set(nextJobs.map((j) => j.id));
  for (const job of previousJobs) {
    if (retainedIds.has(job.id)) continue;
    removeFileIfExists(resolveJobFile(cwd, job.id));
    removeFileIfExists(job.logFile);
  }

  fs.writeFileSync(stateFilePath(cwd), `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  return nextState;
}

export function updateState(cwd, mutate) {
  const state = loadState(cwd);
  mutate(state);
  return saveState(cwd, state);
}

export function upsertJob(cwd, jobPatch) {
  return updateState(cwd, (state) => {
    const timestamp = nowIso();
    const idx = state.jobs.findIndex((j) => j.id === jobPatch.id);
    if (idx === -1) {
      state.jobs.unshift({
        createdAt: timestamp,
        updatedAt: timestamp,
        ...jobPatch,
      });
    } else {
      state.jobs[idx] = {
        ...state.jobs[idx],
        ...jobPatch,
        updatedAt: timestamp,
      };
    }
  });
}

export function listJobs(cwd) {
  return loadState(cwd).jobs;
}

export function getJob(cwd, jobId) {
  return loadState(cwd).jobs.find((j) => j.id === jobId) ?? null;
}

export function writeJobFile(cwd, jobId, payload) {
  ensureStateDir(cwd);
  const jobFile = resolveJobFile(cwd, jobId);
  fs.writeFileSync(jobFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return jobFile;
}

export function readJobFile(cwd, jobId) {
  const jobFile = resolveJobFile(cwd, jobId);
  if (!fs.existsSync(jobFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(jobFile, "utf8"));
  } catch {
    return null;
  }
}

export function resolveJobFile(cwd, jobId) {
  return path.join(resolveJobsDir(cwd), `${jobId}.json`);
}

export function resolveJobLogFile(cwd, jobId) {
  ensureStateDir(cwd);
  return path.join(resolveJobsDir(cwd), `${jobId}.log`);
}

export function writeJobOutput(cwd, jobId, content) {
  ensureStateDir(cwd);
  const filePath = path.join(resolveJobsDir(cwd), `${jobId}.txt`);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

export function readJobOutput(cwd, jobId) {
  try {
    const filePath = path.join(resolveJobsDir(cwd), `${jobId}.txt`);
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
