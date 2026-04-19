---
name: chat
description: Send a task or question to Kiro CLI
argument-hint: "[--background|--wait] [--agent <name>] [--resume|--resume-id <id>] <prompt>"
context: fork
allowed-tools: Bash(node:*), AskUserQuestion
---

Route this request to Kiro CLI via the companion script.
The final user-visible response must be Kiro's output verbatim.

Raw user request:
$ARGUMENTS

Execution mode:

- If the request includes `--background`, run in background.
- If the request includes `--wait`, run in foreground.
- If neither flag is present, default to foreground for small, clearly bounded requests. For complicated, open-ended, or multi-step requests, use `AskUserQuestion` exactly once to ask whether to run in foreground or background.
- `--background` and `--wait` are execution flags for Claude Code. They are forwarded to the companion script which handles them.

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" chat "$ARGUMENTS"
```

Operating rules:

- Return the Kiro companion stdout verbatim to the user.
- Do not paraphrase, summarize, rewrite, or add commentary before or after it.
- Do not inspect files, monitor progress, or do follow-up work.
- If the companion reports that kiro-cli is missing or unauthenticated, stop and tell the user to run `/kiro:setup`.
- If the user did not supply a prompt, ask what Kiro should do.
