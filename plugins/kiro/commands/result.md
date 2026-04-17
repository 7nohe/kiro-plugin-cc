---
description: Show the output for a finished Kiro job
argument-hint: "[job-id]"
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" result $ARGUMENTS`

Present the full job result to the user without condensation:
- Job identification and completion status
- Complete result output
- Any error messages encountered
- Available follow-up commands (`/kiro:status`, `/kiro:chat`)
