const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

let serverProcess = null;
let mainWindow = null;
let desktopDataDir = "";
let desktopConfigFile = "";
let registeredMuteHotkey = "";

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

app.whenReady().then(async () => {
  const port = await findOpenPort(3217);
  const appUrl = `http://127.0.0.1:${port}`;
  await startLocalServer(port, appUrl);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 980,
    minHeight: 720,
    title: "TTS Everything",
    backgroundColor: "#090d14",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "desktop-preload.js")
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(`${appUrl}/desktop.html`);
  registerSavedMuteHotkey();
});

app.on("window-all-closed", () => {
  stopLocalServer();
  app.quit();
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  stopLocalServer();
});

ipcMain.handle("set-mute-hotkey", (_event, accelerator) => {
  return registerMuteHotkey(accelerator);
});

function findOpenPort(startPort) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const tester = net.createServer()
        .once("error", () => tryPort(port + 1))
        .once("listening", () => {
          tester.close(() => resolve(port));
        })
        .listen(port, "127.0.0.1");
    };
    tryPort(startPort);
  });
}

async function startLocalServer(port, appUrl) {
  const dataDir = path.join(app.getPath("userData"), "data");
  const configFile = path.join(app.getPath("userData"), "tts-everything-config.json");
  desktopDataDir = dataDir;
  desktopConfigFile = configFile;
  serverProcess = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      DESKTOP_MODE: "1",
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: appUrl,
      DATA_DIR: dataDir,
      DESKTOP_CONFIG_FILE: configFile,
      SESSION_SECRET: "desktop-local-session-secret"
    },
    stdio: "ignore",
    windowsHide: true
  });

  serverProcess.once("exit", () => {
    serverProcess = null;
  });

  await waitForServer(appUrl);
}

function registerSavedMuteHotkey() {
  const settings = readDesktopSettings();
  registerMuteHotkey(settings.muteHotkey || "");
}

function registerMuteHotkey(accelerator) {
  const nextAccelerator = String(accelerator || "").trim();
  if (registeredMuteHotkey) {
    globalShortcut.unregister(registeredMuteHotkey);
    registeredMuteHotkey = "";
  }
  if (!nextAccelerator) {
    return { ok: true, accelerator: "" };
  }

  const registered = globalShortcut.register(nextAccelerator, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("toggle-tts-mute");
    }
  });

  if (!registered) {
    return {
      ok: false,
      accelerator: "",
      error: `${nextAccelerator} is already used by another app or Windows.`
    };
  }

  registeredMuteHotkey = nextAccelerator;
  return { ok: true, accelerator: nextAccelerator };
}

function readDesktopSettings() {
  if (!desktopConfigFile && !desktopDataDir) {
    return {};
  }
  try {
    const filePath = desktopConfigFile || path.join(desktopDataDir, "desktop-settings.json");
    if (!fs.existsSync(filePath)) {
      const legacyPath = path.join(desktopDataDir, "desktop-settings.json");
      if (!fs.existsSync(legacyPath)) {
        return {};
      }
      const legacyParsed = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
      return legacyParsed && typeof legacyParsed === "object" ? legacyParsed : {};
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function waitForServer(appUrl) {
  const deadline = Date.now() + 15000;
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`${appUrl}/api/health`, (response) => {
        response.resume();
        if (response.statusCode === 200) {
          resolve();
          return;
        }
        retry();
      });
      request.on("error", retry);
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error("Local desktop server did not start in time."));
        return;
      }
      setTimeout(check, 250);
    };
    check();
  });
}

function stopLocalServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
