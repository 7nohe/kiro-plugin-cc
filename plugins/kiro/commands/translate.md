---
description: Convert natural language to a shell command using Kiro
argument-hint: "<description of what you want to do>"
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" translate "$ARGUMENTS"`

Present the translated command to the user.
Do not execute the translated command automatically.
