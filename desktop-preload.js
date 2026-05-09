const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ttsDesktop", {
  setMuteHotkey: (accelerator) => ipcRenderer.invoke("set-mute-hotkey", accelerator),
  onToggleMute: (callback) => {
    if (typeof callback !== "function") {
      return;
    }
    ipcRenderer.on("toggle-tts-mute", callback);
  }
});
