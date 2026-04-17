/**
 * Render the setup report as human-readable text.
 */
export function renderSetupReport(report) {
  const lines = [];

  if (report.kiroCli.available) {
    lines.push(`✔ kiro-cli ${report.kiroCli.version} found`);
  } else {
    lines.push(`✘ kiro-cli not found`);
    lines.push("");
    lines.push("Install kiro-cli:");
    lines.push("  curl -fsSL https://cli.kiro.dev/install | bash");
    return lines.join("\n");
  }

  if (report.auth.loggedIn) {
    lines.push(`✔ Authenticated: ${report.auth.output}`);
  } else {
    lines.push(`✘ Not authenticated`);
    lines.push("");
    lines.push("Run `!kiro-cli login` to sign in.");
  }

  if (report.doctor) {
    if (report.doctor.ok) {
      lines.push("✔ Doctor check passed");
    } else if (report.doctor.error) {
      lines.push(`⚠ Doctor: ${report.doctor.error}`);
    }
  }

  if (report.ready) {
    lines.push("");
    lines.push("Kiro is ready to use.");
  }

  return lines.join("\n");
}

/**
 * Render a list of jobs as a Markdown table.
 */
export function renderStatusTable(jobs) {
  if (jobs.length === 0) {
    return "No jobs found.";
  }

  const lines = [
    "| ID | Type | Status | Started | Duration | Summary |",
    "|------|------|--------|---------|----------|---------|",
  ];

  for (const job of jobs) {
    const elapsed = formatDuration(job.startedAt, job.finishedAt);
    const summary = (job.summary ?? job.prompt ?? "").slice(0, 60);
    lines.push(
      `| ${job.id} | ${job.type ?? job.jobClass ?? "-"} | ${job.status} | ${formatTime(job.startedAt)} | ${elapsed} | ${summary} |`
    );
  }

  return lines.join("\n");
}

/**
 * Render detailed info for a single job.
 */
export function renderJobDetail(job) {
  const lines = [
    `**Job ID:** ${job.id}`,
    `**Type:** ${job.type ?? job.jobClass ?? "-"}`,
    `**Status:** ${job.status}`,
    `**Started:** ${formatTime(job.startedAt)}`,
  ];

  if (job.finishedAt) {
    lines.push(`**Finished:** ${formatTime(job.finishedAt)}`);
    lines.push(`**Duration:** ${formatDuration(job.startedAt, job.finishedAt)}`);
  }

  if (job.prompt) {
    lines.push(`**Prompt:** ${job.prompt}`);
  }

  if (job.error) {
    lines.push(`**Error:** ${job.error}`);
  }

  return lines.join("\n");
}

/**
 * Render cancel confirmation.
 */
export function renderCancelReport(job) {
  if (job) {
    return `Cancelled job ${job.id} (${job.type ?? job.jobClass ?? "unknown"}).`;
  }
  return "No active job found to cancel.";
}

function formatTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleTimeString();
}

function formatDuration(startIso, endIso) {
  if (!startIso) return "-";
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const sec = Math.round((end - start) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m${remSec}s`;
}
