# ScreenPost MCP

Connect an MCP client to [ScreenPost](https://screenpost.app), a native macOS app for screenshots, screen recordings and posting to X. The MCP server is a stdio helper that ships inside the app. This repository contains only the launchers and listing files that point your client at it: an MCPB bundle, a Claude Code plugin, and registry metadata.

The ScreenPost app itself is proprietary. The MIT license in this repository covers only the files in this repository.

Full documentation: https://screenpost.app/mcp

## Requirements

- A Mac with Apple Silicon, macOS 14 or later.
- ScreenPost installed in /Applications. It is a paid app ( once) with a free 7-day trial: https://screenpost.app
- In ScreenPost, turn on Settings > Agents > "Allow agents to control ScreenPost". Until then the helper has nothing to talk to.

The helper path is `/Applications/ScreenPost.app/Contents/Helpers/screenpost-mcp`. It speaks newline-delimited JSON-RPC over stdio and takes no arguments or environment variables. The server name is `screenpost`.

## Install

### Claude Desktop

Download `screenpost.mcpb` from the [latest release](https://github.com/lamazzing/screenpost-mcp/releases/latest) and open it. The bundle is a small Node launcher that starts the helper inside the installed app.

### Claude Code

Plugin:

```
/plugin marketplace add lamazzing/screenpost-mcp
/plugin install screenpost@screenpost
```

Or one line, without the plugin:

```
claude mcp add screenpost -- /Applications/ScreenPost.app/Contents/Helpers/screenpost-mcp
```

### Cursor

[Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=screenpost&config=eyJjb21tYW5kIjoiL0FwcGxpY2F0aW9ucy9TY3JlZW5Qb3N0LmFwcC9Db250ZW50cy9IZWxwZXJzL3NjcmVlbnBvc3QtbWNwIn0=)

Or add to `~/.cursor/mcp.json`, using the JSON under "Generic" below.

### VS Code

Add to `.vscode/mcp.json` (VS Code uses the `servers` key):

```json
{
  "servers": {
    "screenpost": {
      "type": "stdio",
      "command": "/Applications/ScreenPost.app/Contents/Helpers/screenpost-mcp"
    }
  }
}
```

### Generic JSON

```json
{
  "mcpServers": {
    "screenpost": {
      "command": "/Applications/ScreenPost.app/Contents/Helpers/screenpost-mcp"
    }
  }
}
```

## Safety model

- Agent access is off by default and is switched on by you in ScreenPost > Settings > Agents.
- Everything runs on your Mac. The helper forwards to the running app over local IPC.
- Composing, posting and scheduling to X go through a native approval sheet in the app. The agent cannot approve its own request.
- `redact_secrets` finds and covers likely secrets in a capture before you export or share it.
- Share links are capability URLs that you can update or revoke (`update_share_link`, `revoke_share_link`).

## Tools (49)

- Status and settings: `get_status`, `list_capabilities`, `get_settings`, `set_settings`, `get_editor_options`, `list_displays`, `list_windows`
- Capture and record: `take_screenshot`, `start_recording`, `stop_recording`, `cancel_recording`, `get_recording_status`, `import_media`
- Library: `list_captures`, `get_capture`, `get_media_base64`, `delete_capture`, `reveal_in_finder`, `open_in_editor`, `copy_to_clipboard`
- Edit: `annotate`, `crop`, `beautify`, `list_beautify_presets`, `redact_secrets`, `extract_text`, `trim_clip`, `make_gif`, `undo`, `redo`, `revert_edits`
- Export: `export`, `upload_media_to_url`
- Posting to X: `compose_post`, `enhance_text`, `count_post_length`, `post_now`, `schedule_post`, `list_posts`, `list_scheduled`, `cancel_scheduled`, `retry_failed`, `get_request_status`, `set_default_x_account`, `open_in_x_compose`
- Share links: `create_share_link`, `update_share_link`, `revoke_share_link`, `share_link_stats`

## If the helper is missing

The launcher prints this to stderr and answers requests with a JSON-RPC error: "Install ScreenPost from https://screenpost.app and turn on Settings > Agents."

## Development

`npm test` runs the launcher tests. They call only initialize, tools/list and the read-only tools `get_status` and `list_capabilities`, and never post or call external services. `npm run pack` builds `screenpost.mcpb` with the official MCPB CLI.

## Support

support@screenpost.app
