# Kiro Plugin for Claude Code

Use [Kiro CLI](https://kiro.dev/) from inside Claude Code to chat, translate shell commands, or delegate tasks.

This plugin is for Claude Code users who want an easy way to start using Kiro from the workflow
they already have.

## What You Get

- `/kiro:review` for a code review powered by Kiro
- `/kiro:chat` to send tasks or questions to Kiro
- `/kiro:aws-advisor` for AWS environment advice on cost, security, and performance
- `/kiro:translate` to convert natural language to shell commands
- `/kiro:status`, `/kiro:result`, and `/kiro:cancel` to manage background jobs

## Requirements

- **[Kiro CLI](https://kiro.dev/docs/cli/installation/)** with a valid login
- **Node.js 18.18 or later**

## Install

Add the marketplace in Claude Code:

```bash
/plugin marketplace add 7nohe/kiro-plugin-cc
```

Install the plugin:

```bash
/plugin install kiro@kiro-plugin-cc
```

Reload plugins:

```bash
/reload-plugins
```

Then run:

```bash
/kiro:setup
```

`/kiro:setup` will tell you whether Kiro is ready. If kiro-cli is missing, it can offer to install it for you.

If you prefer to install kiro-cli yourself, use:

```bash
curl -fsSL https://cli.kiro.dev/install | bash
```

If kiro-cli is installed but not logged in yet, run:

```bash
!kiro-cli login
```

After install, you should see:

- the slash commands listed below
- the `kiro-delegate` subagent in `/agents`

One simple first run is:

```bash
/kiro:chat hello
/kiro:status
/kiro:result
```

## Usage

### `/kiro:review`

Runs a code review on your current changes using Kiro.

Use it when you want:

- a review of your uncommitted changes
- a review of your branch compared to a base branch like `main`

Use `--base <ref>` for branch review. It also supports `--wait` and `--background`.

Examples:

```bash
/kiro:review
/kiro:review --base main
/kiro:review --background
```

This command is read-only and will not perform any changes. When run in the background, use [`/kiro:status`](#kirostatus) to check progress.

### `/kiro:chat`

Sends a task or question to Kiro CLI.

Use it when you want to:

- ask Kiro to investigate or fix something
- delegate a substantial task to Kiro
- run a task in the background while continuing other work

It supports `--background`, `--wait`, `--agent <name>`, `--resume`, and `--resume-id <id>`.

Examples:

```bash
/kiro:chat investigate why the tests are failing
/kiro:chat --background refactor the auth module
/kiro:chat --agent my-agent fix the deployment script
```

When run in the background, use [`/kiro:status`](#kirostatus) to check progress and [`/kiro:cancel`](#kirocancel) to stop the task.

### `/kiro:aws-advisor`

Analyzes your AWS environment and provides recommendations for cost optimization, security, reliability, and performance.

Kiro uses real AWS API calls to inspect your resources, so it gives advice based on actual state rather than guesswork.

It supports `--background` and `--wait`. If no prompt is given, a general scan runs automatically.

Examples:

```bash
/kiro:aws-advisor
/kiro:aws-advisor check for unused EBS volumes and Elastic IPs
/kiro:aws-advisor --background review IAM policies for least privilege
```

When run in the background, use [`/kiro:status`](#kirostatus) to check progress.

### `/kiro:translate`

Converts natural language to a shell command using Kiro.

The translated command is presented to the user but **not executed automatically**.

Examples:

```bash
/kiro:translate find all TODO comments in the src directory
/kiro:translate show disk usage sorted by size
```

### `/kiro:status`

Shows running and recent Kiro jobs for the current session.

Examples:

```bash
/kiro:status
/kiro:status chat-abc123
```

### `/kiro:result`

Shows the output of a completed Kiro job.

Examples:

```bash
/kiro:result
/kiro:result chat-abc123
```

### `/kiro:cancel`

Cancels an active background Kiro job.

Examples:

```bash
/kiro:cancel
/kiro:cancel chat-abc123
```

### `/kiro:setup`

Checks whether kiro-cli is installed and authenticated, and runs a system health check.

## Typical Flows

### Review Before Shipping

```bash
/kiro:review
```

### Ask Kiro a Quick Question

```bash
/kiro:chat what does the handleAuth function do?
```

### Delegate a Long-Running Task

```bash
/kiro:chat --background investigate the flaky integration test
/kiro:status
/kiro:result
```

### Translate a Command

```bash
/kiro:translate list all open ports on this machine
```

## Kiro Integration

This plugin wraps the [Kiro CLI](https://kiro.dev/docs/cli/). It uses the global `kiro-cli` binary installed in your environment and applies the same configuration.

Because the plugin uses your local Kiro CLI:

- it uses the same kiro-cli install you would use directly
- it uses the same local authentication state
- it uses the same repository checkout and machine-local environment

## License

Apache-2.0
