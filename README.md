# TTS Everything

Local desktop control software for multistream live TTS.

## Run

Double-click `Start-TTSToTwitch-Desktop.bat`, or run:

```powershell
npm.cmd run desktop
```

The app stores local settings, including TTS provider API keys, in Electron app data on this computer.

## Gifts/Donos Feed

TTS Everything includes a shared Gifts/Donos page that combines TikTok gifts and Streamlabs donations into one queue.

### TikTok Gifts

Enable `Read TikTok Live` in Live Setup and enter the creator's TikTok handle. TTS Everything opens a local Chromium-based TikTok browser session, lets TikTok's own LIVE page create its Webcast WebSocket, captures those frames, and decodes chat/gift events when possible. TikTok gifts appear in the Gifts/Donos page and popout window.

TikFinity is no longer required for the built-in TikTok path. If TikTok asks for login, log in manually in the opened browser window. TTS Everything does not ask for your TikTok password, does not automate login, and does not print cookies or session tokens.

Raw TikTok diagnostics are off by default. Only enable diagnostics/raw logging when debugging because raw frames can include viewer usernames, chat messages, gift data, and profile URLs.

### Streamlabs Donations Through Streamer.bot

No Streamlabs API key is required. Streamer.bot already listens to Streamlabs, so TTS Everything connects to Streamer.bot's local WebSocket server.

1. In Streamer.bot, open `Servers/Clients > WebSocket Server`.
2. Start the WebSocket server. The default endpoint is `ws://127.0.0.1:8080/`.
3. In TTS Everything, enable `Read Streamlabs donations via Streamer.bot`.
4. Keep the endpoint as `ws://127.0.0.1:8080/` unless you changed it in Streamer.bot.
5. Open `Gifts/Donos` or use `Pop out` for a separate pinned window.

The app subscribes to `Streamlabs.Donation` events and normalizes donor name, amount, currency, message, and timestamp for the shared queue.

## Desktop Packaging

Build the Windows installer with:

```powershell
npm.cmd run dist
```

The installer is written to `release/`. The app also has a Playback setting for `When exiting the app, minimize to tray instead`; when enabled, closing the window hides it to the tray and the tray menu can reopen or quit it.

## TikTok Developer Capture

For isolated TikTok capture testing:

```powershell
npm.cmd run tiktok:dev -- --handle creatorhandle
```

Use `--save-raw` only when intentionally debugging raw Webcast frames. The command prints sanitized status and decoded event summaries only; it does not print cookies or tokens.
