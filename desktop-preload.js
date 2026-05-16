const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ttsDesktop", {
  setMuteHotkey: (accelerator) => ipcRenderer.invoke("set-mute-hotkey", accelerator),
  openCombinedChatWindow: () => ipcRenderer.invoke("open-combined-chat-window"),
  setCombinedChatAlwaysOnTop: (pinned) => ipcRenderer.invoke("set-combined-chat-always-on-top", Boolean(pinned)),
  openGiftDonoWindow: () => ipcRenderer.invoke("open-gift-dono-window"),
  setGiftDonoAlwaysOnTop: (pinned) => ipcRenderer.invoke("set-gift-dono-always-on-top", Boolean(pinned)),
  onToggleMute: (callback) => {
    if (typeof callback !== "function") {
      return;
    }
    ipcRenderer.on("toggle-tts-mute", callback);
  }
});
