---
description: Check whether kiro-cli is installed and authenticated
allowed-tools: Bash(node:*), Bash(curl:*), AskUserQuestion
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" setup --json $ARGUMENTS
```

If the result says kiro-cli is unavailable:
- Use `AskUserQuestion` exactly once to ask whether Claude should install kiro-cli now.
- Put the install option first and suffix it with `(Recommended)`.
- Use these two options:
  - `Install kiro-cli (Recommended)`
  - `Skip for now`
- If the user chooses install, run:

```bash
curl -fsSL https://cli.kiro.dev/install | bash
```

- Then rerun:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/kiro-companion.mjs" setup --json $ARGUMENTS
```

If kiro-cli is already installed:
- Do not ask about installation.

Output rules:
- Present the final setup output to the user.
- If installation was skipped, present the original setup output.
- If kiro-cli is installed but not authenticated, preserve the guidance to run `!kiro-cli login`.
