# TTS Everything

Local desktop control software for multistream live TTS.

## Run

Double-click `Start-TTSToTwitch-Desktop.bat`, or run:

```powershell
npm.cmd run desktop
```

The app stores local settings, including TTS provider API keys, in Electron app data on this computer.

## Gifts/Donos Feed

TTS Everything includes a shared Gifts/Donos page for donation-style events. Streamlabs donations are supported now; TikTok gift events are intentionally not routed yet.

### TikTok Live Chat

Enable TikTok Live in Live Setup, enter the creator handle, and log in manually if TikTok asks. Only chat message events are routed into TTS; gifts, likes, and follows are reserved for later features.

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

