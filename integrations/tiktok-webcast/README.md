# Built-in TikTok Live Webcast Source

This integration replaces the old TikFinity requirement with a browser-assisted raw Webcast transport.

It does not use TikFinity, TikTok-Live-Connector, `@zerodytrash` packages, or related ports/wrappers. It does not scrape visible chat DOM. It opens a normal Chromium-based browser session with Playwright, lets TikTok's own web client establish the LIVE WebSocket, and inspects WebSocket frames.

## Layers

1. Raw capture: every likely TikTok LIVE WebSocket frame is converted into a `TikTokRawWebcastFrame`.
2. Safe payload routing: raw, gzip, brotli, and deflate candidates are attempted without mutating the original frame.
3. Generic protobuf inspection: protobuf wire structure is parsed without a schema where possible.
4. Optional schema decoding: local `.proto` files can be loaded if supplied by the developer.
5. Event normalization: confidently decoded chat/gift events are mapped into TTS Everything's existing chat and Gifts/Donos paths.

Raw logging is opt-in because raw frames can contain viewer usernames, chat messages, gifts, and profile URLs.
