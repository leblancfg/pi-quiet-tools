# pi-quiet-tools

Hide tool output in the [pi coding agent](https://github.com/earendil-works/pi).
Each tool call stays on screen as a single line. The output below it is gone.
This version requires pi 1.0.0 or newer.

```
  $ pnpm run build --verbose --with-a-very-long-flag-that-will…
  read src/index.ts
  $ git status --short
```

Toggle it with a hotkey while you type. Your draft message stays in the editor.

## Install

```bash
pi install git:github.com/leblancfg/pi-quiet-tools
```

## Use

| Action | How |
|--------|-----|
| Toggle | `ctrl+alt+o`, or `/quiet` |
| Hide output | `/quiet on` |
| Show output | `/quiet off` |
| Check the current mode | `/quiet status` |
| Start a session with output hidden | `pi --quiet-tools` |

Each change reports `Tool output: hidden` or `Tool output: visible`, and applies
to the whole transcript: tool rows already on screen collapse and expand with it.

The setting is saved to `~/.pi/agent/quiet-tools.json`, so it survives restarts.
Set `PI_QUIET_TOOLS_STATE` to store it somewhere else.

A tool call that does not fit the terminal width gets cut at the edge and marked
with `…`. Multi-line commands get the same mark.

## Why not `/settings`?

Extensions cannot add entries to pi's `/settings` menu. The `/quiet` command and
the hotkey are the interface.

## How it works

Pi draws each tool row with two renderers: one for the call, one for the
result. This extension wraps them. The model still receives the full output.
Only the screen changes.

On pi 1.0.1 and newer, the extension uses `pi.registerToolRenderer()`. That
covers every tool: the core tools, `codemode`, `tool_search`, MCP tools, and
tools from other extensions. No tool is replaced.

On pi 1.0.0, that hook does not exist. The extension re-registers the core
tools with wrapped renderers and passes each `execute` function through
untouched. `codemode`, `tool_search`, and MCP tools keep their output, unless
you opt in as shown in the next section.

In both cases the original result renderer still runs while output is hidden,
because it owns the elapsed-time timer for the row.

### Quiet codemode and MCP tools on pi 1.0.0

Quiet Tools can run pi's `codemode`, `tool-search`, and `mcp` built-in
extensions itself, so that it can wrap the tools they register. Turn off pi's
copy of each one and name it under `quietTools.builtins` in
`~/.pi/agent/settings.json`:

```json
{
  "extensions": ["-builtin:codemode", "-builtin:tool-search", "-builtin:mcp"],
  "quietTools": { "builtins": ["codemode", "tool-search", "mcp"] }
}
```

If you name a built-in without turning off pi's copy, pi warns at startup that
it skipped its own copy. Do not use this with another extension that replaces
one of these built-ins. If you uninstall Quiet Tools, remove both entries, or
`codemode` and MCP support go away with it. On pi 1.0.1 and newer you do not
need this.

### Limits

- On pi 1.0.0, a core tool that another extension already replaced is left
  alone. Sandbox and remote-execution extensions keep working, but their output
  stays visible. The extension names those tools at startup.
- On pi 1.0.0, rebuilding the core tools means re-reading the settings pi passes
  to them: `shellPath`, `shellCommandPrefix`, and `images.autoResize`.
- Toggling redraws rows already on screen through pi's tool-expansion state,
  which is the only lever an extension has for that.

## Develop

```bash
pnpm install
pnpm test
pnpm check
pi -e ./extensions/quiet-tools.ts   # try it without installing
```

## License

MIT
