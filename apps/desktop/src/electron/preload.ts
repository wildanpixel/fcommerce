import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("marketplaceOS", {
  apiBaseUrl: process.env.MIO_API_BASE_URL ?? "http://127.0.0.1:4123/api",
  platform: {
    get: () => ipcRenderer.invoke("platform:get"),
    openPath: (targetPath: string) => ipcRenderer.invoke("platform:open-path", targetPath),
    openUrl: (url: string) => ipcRenderer.invoke("platform:open-url", url),
    pickFolder: () => ipcRenderer.invoke("platform:pick-folder"),
    pickFile: () => ipcRenderer.invoke("platform:pick-file"),
    copyText: (value: string) => ipcRenderer.invoke("platform:copy-text", value)
  }
});
