# TTS Everything Software Guide

## Overview

TTS Everything is a local Windows desktop app for streamers who want live chat messages read out loud while they stream. It is built for multistreaming, so Twitch, TikTok Live, Kick, YouTube Live, and Rumble can all feed into one shared TTS system instead of being managed as separate tools.

The app is designed to be used during a live broadcast. A streamer opens TTS Everything, connects the platforms they are using, chooses voices and moderation rules, then lets the app process incoming chat messages into spoken audio. It can also show all platform chats together in one Twitch-style chat window and collect gifts or donations into a shared Gifts/Donos feed.

The software runs locally on the user's computer. Saved API keys, source settings, voice assignments, moderation lists, and local configuration are stored in the user's app data on that machine.

## Main Uses

### Multistream Chat TTS

The primary purpose of TTS Everything is to read live chat messages out loud from multiple platforms. Instead of only supporting one chat source, the app can connect to several platforms at once and put eligible messages into one shared TTS queue.

This is useful for streamers who:

- Stream to Twitch and TikTok at the same time.
- Want YouTube, Kick, Rumble, and Twitch chat to all be heard through the same TTS system.
- Need consistent moderation and filtering across every platform.
- Want one local control panel instead of several browser tabs or bots.

### Unified Chat View

The All Chats window combines messages from supported platforms into one feed. It is styled to feel similar to Twitch chat, with platform icons, usernames, role badges, and message text.

The chat window can be popped out into its own window and pinned on top. This is useful if the streamer wants to keep the combined chat visible while using OBS, a game, Streamer.bot or other stream tools.

### Shared Gifts and Donations Feed

The Gifts/Donos page collects monetary or gift-style events into a single list. The current implementation supports:

- Streamlabs donations through Streamer.bot.

This gives the streamer one place to watch support events from multiple sources. The Gifts/Donos window can also be popped out and pinned.

### OBS Browser Sources

TTS Everything includes browser-source style output for stream overlays. The current OBS avatar source shows a transparent page with a speaking image while TTS audio is playing. This lets the stream display a visual cue when TTS is active.

## Supported Platforms

### Twitch

Twitch chat is read directly by channel name. The streamer enters the Twitch channel in Live Setup and enables Twitch chat reading. Incoming Twitch messages can enter the TTS queue, appear in All Chats, and be filtered by the moderation rules.

### TikTok Live

TikTok Live uses the app's local TikTok login and capture helper. The streamer enters a TikTok handle, enables TikTok Live, and logs in manually in the browser window if TikTok asks.

Only TikTok chat message events are routed into All Chats and the TTS queue. Gift, like, follow, and other TikTok event types are ignored for now and will be handled by later features.

### Kick

Kick chat can be connected by channel slug. Kick messages are included in the shared TTS queue and All Chats feed when enabled.

### YouTube Live

YouTube Live chat uses the YouTube Data API. The streamer enters a YouTube API key and a YouTube live chat ID. YouTube messages can then be polled and processed into the shared TTS queue.

### Rumble

Rumble chat uses the Rumble Live Stream API URL. The streamer enters the API URL in Live Setup, and the app reads messages from that source when enabled.

### Streamlabs Donations Through Streamer.bot

The app does not require a Streamlabs API key. Instead, Streamer.bot acts as the bridge because Streamer.bot can already receive Streamlabs donation events.

TTS Everything connects to the Streamer.bot WebSocket server, normally:

```text
ws://127.0.0.1:8080/
```

After connecting, the app subscribes to Streamlabs donation events and adds them to the Gifts/Donos feed.

## Core App Sections

### Live Setup

Live Setup is where the streamer chooses which platforms are active.

Available source controls include:

- Read Twitch chat.
- Read TikTok Live.
- Read Kick chat.
- Read YouTube chat.
- Read Rumble chat.
- Read Streamlabs donations via Streamer.bot.

Live Setup also shows source connection status tiles for Twitch, TikTok, Kick, YouTube, Rumble, Streamer.bot, and Playback.

### All Chats

The All Chats page shows a combined chat feed. Messages from connected platforms appear in one list with:

- Platform icon.
- Username.
- Important role badges such as `MOD` and `SUB`.
- Message text.

The streamer can clear the chat feed or pop it out into a separate window. The popout has a pin option so it can stay above other windows.

### Gifts/Donos

The Gifts/Donos page shows a shared event queue for Streamlabs donations. TikTok Live gifts are not routed into this feed yet.

- Quantity.
- Diamond value when available.
- Optional message or comment.

Streamlabs donation rows show information such as:

- Streamlabs source label.
- Donor name.
- Donation label.
- Amount.
- Optional donation message.

The Gifts/Donos window can also be popped out and pinned.

### TTS and Voices

The TTS and Voices section controls the voice providers and voice behavior.

The app supports:

- ElevenLabs.
- Cartesia.
- Single-provider mode.
- Both-provider mode.
- Source-based voice routing.
- Fixed voice mode.
- Rotating voice modes.
- Custom voice entries.
- Per-user voice assignments.

This makes it possible to give different platforms different TTS providers, or to assign specific voices to recurring chatters.

### Moderation

Moderation controls decide which messages are allowed into TTS.

The app includes options for:

- Skipping commands.
- Skipping links.
- Skipping emote-only messages.
- Mentions-only mode.
- Follower-only style filtering.
- Minimum message length.
- Maximum message characters.
- Per-user cooldown.
- Queue size limits.
- Fast chat protection.
- Anti-spam checks.
- Banned chatters.
- Banned words.

The banned words list is a single shared list. It is used for banned words, blocked phrases, and blocked sounds. Users can paste terms directly into the expandable textarea or upload `.txt` word lists. Uploaded lists are merged into the main list.

The filter is intentionally aggressive for TTS safety. Messages are blocked before conversion to speech when they match banned terms, hard-blocked slur patterns, spam patterns, or unsafe moderation rules.

### Playback

Playback controls how spoken messages are queued and played.

Important settings include:

- Never skip mid-speech.
- Max queue size.
- Pause seconds between messages.
- Fast chat threshold.
- Fast chat time window.
- Skip behavior when chat is too fast.
- Global mute hotkey.
- Manual mute/unmute.
- Minimize to tray when exiting.
- OBS avatar browser source URL.

The minimize-to-tray option changes close-button behavior. When enabled, closing the main app window hides it to the Windows tray instead of quitting. The tray menu can reopen the app or quit it fully.

### Reference

The Reference page gives basic notes about provider choices, especially ElevenLabs and Cartesia.

## TTS Queue Behavior

All eligible chat messages share one TTS queue. This matters because the app is meant for multistreaming. A Twitch message, TikTok message, and YouTube message do not create separate audio systems; they all compete for the same spoken output.

The moderation and queue settings decide what happens when the queue gets crowded. Depending on the selected behavior, the app can drop older waiting messages, skip new ones, or keep only the latest message during very fast chat.

The app is designed to avoid interrupting active speech when `Never skip mid-speech` is enabled.

## Voice Assignment

TTS Everything can remember voice assignments for chatters. This lets a recurring viewer keep the same voice over time.

Voice assignment is useful when:

- A streamer wants regulars to sound consistent.
- Different viewers should have different voices.
- The stream uses character-style voices for chat personalities.
- The streamer wants source-specific voices.

Voice assignments are controlled locally and can be saved or cleared from the Live Setup area.

## OBS Usage

### Audio

The app plays generated speech locally. Streamers can capture that audio in OBS using their normal desktop audio capture, application audio capture, or routing setup.

### Avatar Browser Source

The Playback page includes an OBS avatar source URL. Add it to OBS as a Browser Source. It uses a transparent page and changes visual state when TTS is speaking.

Recommended OBS setup:

1. Add a new Browser Source.
2. Paste the URL from TTS Everything.
3. Set width and height as desired.
4. Keep the source transparent.
5. Place it where the TTS speaking indicator should appear.

## TikTok Live Chat Testing

To test TikTok Live chat:

1. Open TTS Everything.
2. Enable `Read TikTok Live`.
3. Enter the creator's TikTok handle.
4. Log in manually in the browser window if TikTok asks.
5. Click `Connect live chat`.
6. Send a TikTok chat message.

Expected result:

```text
[TikTok logo] ViewerName    Hello chat
```

TikTok gifts, likes, and follows are intentionally ignored for now.

## Streamlabs Donation Testing

To test Streamlabs donations:

1. Open Streamer.bot.
2. Make sure Streamlabs is connected inside Streamer.bot.
3. Start the Streamer.bot WebSocket Server.
4. Open TTS Everything.
5. Enable `Read Streamlabs donations via Streamer.bot`.
6. Confirm the endpoint is `ws://127.0.0.1:8080/` unless changed.
7. Click `Connect live chat`.
8. Open the Gifts/Donos page.
9. Trigger a Streamlabs test donation or Streamer.bot donation test event.

Expected result:

```text
[ST] DonorName    DONATION    Streamlabs donation
     $12.34                   4:16 PM
     Optional donation message
```

## Installation and Packaging

The app can be run in development mode or packaged as a Windows installer.

To run from the source folder:

```powershell
npm.cmd run desktop
```

To build the installer:

```powershell
npm.cmd run dist
```

The installer is created in:

```text
release/
```

The current installer file is:

```text
release/TTS Everything Setup 1.0.9.exe
```

## Local Data and Privacy

TTS Everything stores local settings on the user's computer. This can include:

- ElevenLabs API key.
- Cartesia API key.
- YouTube API key.
- Rumble API URL.
- Source settings.
- Moderation lists.
- Banned chatters.
- Voice assignments.
- Custom voices.

These are local runtime settings and should not be committed to GitHub. The software repository includes `.env.example` as a template only.

## Safety and Moderation Philosophy

TTS apps need stronger moderation than normal chat displays because unsafe text becomes spoken audio on stream. TTS Everything blocks messages before they become speech when moderation rules catch them.

The app is built around a conservative moderation approach:

- Block known banned words.
- Block uploaded banned word lists.
- Block unsafe slur variations using hard-coded filters.
- Skip suspicious repeated-word spam.
- Skip messages from banned chatters.
- Skip messages during fast chat if queue limits are reached.
- Avoid reading links, commands, or emote-only messages when those options are enabled.

For stream use, it is better to over-block than to accidentally speak something harmful.

## Troubleshooting

### TikTok messages are not appearing

Check that:

- TTS Everything has `Read TikTok Live` enabled.
- The TikTok handle is correct.
- TikTok login completed in the browser window if prompted.
- TTS Everything is connected after enabling TikTok Live.

### Streamlabs donations are not appearing

Check that:

- Streamer.bot is open.
- Streamlabs is connected inside Streamer.bot.
- Streamer.bot WebSocket Server is started.
- The endpoint in TTS Everything matches Streamer.bot.
- `Read Streamlabs donations via Streamer.bot` is enabled.
- The Streamer.bot status tile shows connected.

### TTS is not speaking

Check that:

- A TTS provider API key is saved.
- The selected voice/provider is valid.
- TTS is not muted.
- The message is not blocked by moderation.
- The queue is not full.
- The message is not too short, too long, a command, a link, or emote-only based on moderation settings.

### Messages are being skipped

Review:

- Banned words.
- Banned chatters.
- User cooldown.
- Fast chat settings.
- Max queue size.
- Skip commands.
- Skip links.
- Skip emotes-only.
- Minimum length.
- Maximum character count.

### The app closes instead of staying in the tray

Go to Playback and enable:

```text
When exiting the app, minimize to tray instead
```

After saving, closing the main window should hide it to the tray. Use the tray menu to reopen or quit.

## Recommended Stream Setup

For a typical multistream setup:

1. Start OBS.
2. Enable TikTok Live and log in if using TikTok.
3. Start Streamer.bot if using Streamlabs donations.
4. Open TTS Everything.
5. Enable the platforms you are streaming to.
6. Save live setup.
7. Connect live chat.
8. Open All Chats as a pinned popout if needed.
9. Open Gifts/Donos as a pinned popout if needed.
10. Verify TTS with a test message.
11. Start streaming.

## Summary

TTS Everything is a local multistream TTS control center. It combines chat from several platforms, speaks eligible messages through ElevenLabs or Cartesia, applies aggressive moderation, supports per-user voice behavior, provides OBS-friendly visual output, and gives streamers popout windows for combined chat and gift/donation events.

Its main value is simplicity during a live stream: one app, one TTS queue, one moderation system, and one place to monitor the chat and support events that matter.

