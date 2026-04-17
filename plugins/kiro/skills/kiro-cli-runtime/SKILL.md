---
name: kiro-cli-runtime
description: Internal helper contract for calling the kiro-companion runtime from Claude Code
user-invocable: false
---

# Kiro CLI Runtime Contract

This contract defines how the `kiro:kiro-delegate` subagent invokes the kiro-companion runtime.

## Primary Helper

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" chat "<raw arguments>"
```

## Rules

- The delegate subagent is a simple forwarder, not an orchestrator.
- It invokes `chat` once and returns stdout unchanged.
- The following subcommands are **prohibited** from this context: `setup`, `status`, `result`, `cancel`, `chat-worker`.
- Every request—whether diagnosis, planning, or implementation—uses the single `chat` command.
- Default to `--trust-all-tools` unless the user explicitly opts out.
- Pass `--agent`, `--resume`, `--resume-id` through if present.
- For background execution, add `--background` to the command.
- Strip `--wait` before invocation (this is a Claude Code execution flag only).
- The subagent must not inspect repositories, read files, or perform independent analysis.
- Return unmodified command output only.
