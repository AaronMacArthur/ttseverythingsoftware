# TTS Everything (Software)

Desktop/live-stream TTS software for Twitch, TikTok Live, Kick, YouTube Live, and Rumble.

This repository contains the software app source only. Local runtime data, logs, environment files, API keys, and dependencies are intentionally excluded.

## Setup

```powershell
npm install
npm test
npm start
```

Create a local `.env` file from `.env.example` if you use optional provider keys. Never commit real API keys or secrets.

## Included

- Electron desktop entry files
- Local Node server
- Dashboard and browser-source UI files
- Static overlay assets

## Excluded

- `node_modules/`
- `.env` and local secrets
- runtime `data/`
- logs
- packaged release/build folders
