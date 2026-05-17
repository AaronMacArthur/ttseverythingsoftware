"use strict";

const http = require("http");
const { WebSocketServer } = require("ws");

class TikTokLocalBridgeServer {
  constructor(service, options = {}) {
    this.service = service;
    this.port = Number(options.port) || 21213;
    this.server = null;
    this.wss = null;
  }

  start() {
    if (this.server) {
      return Promise.resolve(this.getUrl());
    }
    this.server = http.createServer((req, res) => {
      if (req.url === "/health") {
        return sendJson(res, { ok: true });
      }
      if (req.url === "/tiktok/status") {
        return sendJson(res, this.service.getStatus());
      }
      if (req.url?.startsWith("/tiktok/events/recent")) {
        return sendJson(res, { events: this.service.getRecentEvents(100) });
      }
      res.writeHead(404);
      res.end("Not found");
    });
    this.wss = new WebSocketServer({ server: this.server, path: "/tiktok/events" });
    this.service.on("event", (event) => this.broadcast({ type: "event", event }));
    this.service.on("status", (status) => this.broadcast({ type: "status", status }));
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, "127.0.0.1", () => resolve(this.getUrl()));
    });
  }

  stop() {
    this.wss?.close();
    this.wss = null;
    this.server?.close();
    this.server = null;
  }

  broadcast(payload) {
    if (!this.wss) {
      return;
    }
    const text = JSON.stringify(payload);
    for (const client of this.wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(text);
      }
    }
  }

  getUrl() {
    return `ws://127.0.0.1:${this.port}/tiktok/events`;
  }
}

function sendJson(res, payload) {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

module.exports = {
  TikTokLocalBridgeServer
};
