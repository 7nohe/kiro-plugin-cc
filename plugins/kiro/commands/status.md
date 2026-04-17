---
description: Show active and recent Kiro jobs for this workspace
argument-hint: "[job-id] [--all]"
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" status $ARGUMENTS`

If the user did not pass a job ID:
- Render the command output as a single Markdown table.
- Keep it compact. Do not include extra prose outside the table.
- Preserve actionable fields: job ID, type, status, duration, summary, and follow-up commands.

If the user did pass a job ID:
- Present the full command output to the user.
- Do not summarize or condense it.
