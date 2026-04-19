---
name: aws-advisor
description: Get AWS environment advice on cost, security, and performance via Kiro
argument-hint: "[--background|--wait] [prompt]"
context: fork
allowed-tools: Bash(node:*), AskUserQuestion
---

Route this request to Kiro CLI via the companion script with AWS advisor mode.
The final user-visible response must be Kiro's output verbatim.

Raw user request:
$ARGUMENTS

Execution mode:

- If the request includes `--background`, run in background.
- If the request includes `--wait`, run in foreground.
- If neither flag is present, default to foreground. For broad scans (e.g. "check everything"), use `AskUserQuestion` exactly once to ask whether to run in foreground or background.

Foreground flow:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" aws-advisor "$ARGUMENTS"
```

Background flow:

- Launch the advisor with `Bash` in the background:
```typescript
Bash({
  command: `node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" aws-advisor "$ARGUMENTS"`,
  description: "Kiro AWS Advisor",
  run_in_background: true
})
```
- Do not call `BashOutput` or wait for completion in this turn.
- After launching the command, tell the user: "Kiro AWS Advisor started in the background. Check `/kiro:status` for progress."

Operating rules:

- Return the Kiro companion stdout verbatim to the user.
- Do not paraphrase, summarize, rewrite, or add commentary before or after it.
- Do not inspect files, monitor progress, or do follow-up work.
- If the companion reports that kiro-cli is missing or unauthenticated, stop and tell the user to run `/kiro:setup`.
- If the user did not supply a prompt, the advisor will run a general scan. Do not ask for a prompt.
