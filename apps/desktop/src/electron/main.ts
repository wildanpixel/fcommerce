import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  Notification,
  shell
} from "electron";
import type { MenuItemConstructorOptions, OpenDialogOptions } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { ApiServer } from "../api/server.js";
import {
  configurePlatformService,
  createElectronPlatformService,
  getPlatformService
} from "../infrastructure/platform/PlatformService.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | undefined;
let apiServer: ApiServer | undefined;

async function createWindow(): Promise<void> {
  configurePlatformService(createElectronPlatformService(app, shell, Notification));
  registerPlatformIpc();
  configureApplicationMenu();

  const { startApiServer } = await import("../api/server.js");
  process.env.MIO_APP_VERSION = app.getVersion();
  apiServer = await startApiServer();
  process.env.MIO_API_BASE_URL = `http://127.0.0.1:${apiServer.port}/api`;

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#f5f7fb",
    title: "MarketPlace Keyword Competitor Analysis",
    autoHideMenuBar: process.platform !== "darwin",
    webPreferences: {
      preload: join(currentDir, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
  } else {
    await mainWindow.loadFile(join(currentDir, "..", "..", "dist", "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (getPlatformService().shouldQuitOnAllWindowsClosed()) {
    app.quit();
  }
});

app.on("before-quit", () => {
  void apiServer?.close();
});

app.whenReady().then(() => {
  app.setName("MarketPlace Keyword Competitor Analysis");
  void createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

function configureApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(getPlatformService().info.os === "macos"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const }
            ]
          }
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Reports Folder",
          accelerator: "CommandOrControl+Shift+O",
          click: () => void getPlatformService().openPath(getPlatformService().info.directories.reports)
        },
        { type: "separator" },
        { role: getPlatformService().info.os === "macos" ? "close" : "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload", accelerator: "CommandOrControl+R" },
        { role: "toggleDevTools", accelerator: "CommandOrControl+Shift+I" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerPlatformIpc(): void {
  if (ipcMain.listenerCount("platform:get") > 0) {
    return;
  }
  ipcMain.handle("platform:get", () => getPlatformService().info);
  ipcMain.handle("platform:open-path", async (_event, targetPath: string) => {
    await getPlatformService().openPath(targetPath);
    return true;
  });
  ipcMain.handle("platform:open-url", async (_event, url: string) => {
    await getPlatformService().openExternal(url);
    return true;
  });
  ipcMain.handle("platform:pick-folder", async () => {
    const options: OpenDialogOptions = {
      properties: ["openDirectory", "createDirectory"]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("platform:pick-file", async () => {
    const options: OpenDialogOptions = {
      properties: ["openFile"]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("platform:copy-text", (_event, value: string) => {
    clipboard.writeText(value);
    return true;
  });
}
