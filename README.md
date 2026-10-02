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

Pi picks the renderer for a tool row in two slots: one for the call, one for the
result. This extension wraps the core tools, `codemode`, `tool_search`, and the
built-in MCP support. It also wraps MCP tools when their servers connect. The
model still receives the full output. Only the screen changes.

The extension passes each tool's `execute` function through untouched. It also
runs the original result renderer while output is hidden, because that renderer
owns the elapsed-time timer for the row.

### Limits

- A core tool that another extension already replaced is left alone. Sandbox
  and remote-execution extensions keep working, but their output stays visible.
  Tools from unrelated extensions also keep their own output. The extension
  names replaced core tools at startup.
- Quiet Tools takes over pi's replaceable `codemode`, `tool_search`, and MCP
  extensions so it can wrap tools that appear later. Do not combine it with
  another extension that replaces one of those built-ins.
- Rebuilding the core tools means re-reading the settings pi passes to them:
  `shellPath`, `shellCommandPrefix`, and `images.autoResize`. Other settings that
  reach built-in tools in a future pi release would need to be added here.
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
