# Kiro Plugin for Claude Code

Use [Kiro CLI](https://kiro.dev/) from Claude Code to chat, translate shell commands, or delegate tasks.

## Features

| Command | Description |
|---------|-------------|
| `/kiro:setup` | Check kiro-cli installation and authentication |
| `/kiro:chat` | Send a task or question to Kiro CLI |
| `/kiro:translate` | Convert natural language to a shell command |
| `/kiro:status` | Show active and recent jobs |
| `/kiro:result` | Retrieve completed job output |
| `/kiro:cancel` | Cancel an active job |

## Requirements

- [Claude Code](https://claude.ai/claude-code) CLI
- [Kiro CLI](https://kiro.dev/docs/cli/installation/) (`curl -fsSL https://cli.kiro.dev/install | bash`)
- Node.js 18.18 or later

## Getting Started

1. Install the plugin in Claude Code
2. Run `/kiro:setup` to verify kiro-cli is installed and authenticated
3. If needed, run `!kiro-cli login` to sign in
4. Start using `/kiro:chat`, `/kiro:translate`, etc.

## Configuration

The plugin uses your local kiro-cli installation and authentication. Any agent configurations or MCP servers you've set up with kiro-cli will be available.

## License

Apache-2.0
