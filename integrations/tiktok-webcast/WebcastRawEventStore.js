"use strict";

class TikTokRawEventStore {
  constructor(limit = 250) {
    this.limit = Math.max(1, Number(limit) || 250);
    this.frames = [];
    this.events = [];
  }

  addFrame(frame) {
    this.frames.push(frame);
    while (this.frames.length > this.limit) {
      this.frames.shift();
    }
  }

  addEvent(event) {
    this.events.push(event);
    while (this.events.length > this.limit) {
      this.events.shift();
    }
  }

  getRecentFrames(limit = 50) {
    return this.frames.slice(-Math.max(1, Number(limit) || 50));
  }

  getRecentEvents(limit = 100) {
    return this.events.slice(-Math.max(1, Number(limit) || 100));
  }

  clear() {
    this.frames.length = 0;
    this.events.length = 0;
  }
}

module.exports = {
  TikTokRawEventStore
};
