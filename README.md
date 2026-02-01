# Talon MCP

MCP (Model Context Protocol) server for the [Talon](https://talonvoice.com/) accessibility framework. Surfaces important Talon information like logs and provides access to the Python REPL.

## Installation

```bash
bun install
```

## Usage

Run the MCP server:

```bash
bun run tools/mcp-server.ts
```

Or use the CLI flags:

```bash
bun run tools/mcp-server.ts --help
bun run tools/mcp-server.ts --version
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `talon_getLogs` | Get Talon log entries with optional filtering by level or search term |
| `talon_getStatus` | Check if Talon is running |
| `talon_repl` | Execute Python code in Talon REPL |
| `talon_getConfig` | Get Talon configuration paths (home, logs, user scripts) |

## Claude Code Configuration

Add to your MCP config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "talon-mcp": {
      "command": "bun",
      "args": ["run", "/path/to/talon_mcp/tools/mcp-server.ts"]
    }
  }
}
```

## Development

```bash
bun test              # Run tests
bun run format        # Format code
bun run lint          # Lint code
```

## License

MIT
