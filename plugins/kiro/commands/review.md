---
description: Run a code review using Kiro CLI
argument-hint: "[--background|--wait] [--base <ref>]"
context: fork
allowed-tools: Bash(node:*,git:*), AskUserQuestion
---

Run a code review by delegating to Kiro CLI via the companion script.

Raw user arguments:
$ARGUMENTS

Step 1 — Build the diff context:

- If `--base <ref>` is provided, run `git diff <ref>...HEAD` to get the branch diff.
- Otherwise, run `git diff HEAD` to get uncommitted changes. If empty, fall back to `git diff HEAD~1` for the latest commit.
- If there are no changes to review, tell the user and stop.

Step 2 — Determine execution mode:

- If the request includes `--background`, run in background.
- If the request includes `--wait`, run in foreground.
- Otherwise, if the diff is large (more than ~200 lines), recommend background via `AskUserQuestion` exactly once.
- For small diffs, default to foreground.

Step 3 — Send the review request to Kiro:

Strip `--base <ref>` from `$ARGUMENTS` before forwarding. Construct the prompt as:

```
Review the following code changes. Point out bugs, security issues, performance problems, and readability concerns. Be specific with file paths and line references.

<diff>
{the diff content}
</diff>
```

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" chat [remaining flags] "<constructed prompt>"
```

Operating rules:

- Return the Kiro companion stdout verbatim to the user.
- Do not paraphrase, summarize, rewrite, or add commentary before or after it.
- Do not inspect files, monitor progress, or do follow-up work.
- This command is read-only. Do not fix any issues mentioned in the review.
- If the companion reports that kiro-cli is missing or unauthenticated, stop and tell the user to run `/kiro:setup`.
