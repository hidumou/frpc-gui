"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Config operations
  config: {
    list: () => electron.ipcRenderer.invoke("config:list"),
    load: (id) => electron.ipcRenderer.invoke("config:load", id),
    save: (config) => electron.ipcRenderer.invoke("config:save", config),
    delete: (id) => electron.ipcRenderer.invoke("config:delete", id),
    import: (filePath) => electron.ipcRenderer.invoke("config:import", filePath),
    importText: (content, name) => electron.ipcRenderer.invoke("config:import-text", content, name),
    export: (id, filePath) => electron.ipcRenderer.invoke("config:export", id, filePath)
  },
  // FRPC operations
  frpc: {
    start: (id) => electron.ipcRenderer.invoke("frpc:start", id),
    stop: (id) => electron.ipcRenderer.invoke("frpc:stop", id),
    restart: (id) => electron.ipcRenderer.invoke("frpc:restart", id),
    reload: (id) => electron.ipcRenderer.invoke("frpc:reload", id),
    getStatus: (id) => electron.ipcRenderer.invoke("frpc:status", id),
    getProxyStatus: (id) => electron.ipcRenderer.invoke("frpc:proxy-status", id),
    check: () => electron.ipcRenderer.invoke("frpc:check"),
    getPath: () => electron.ipcRenderer.invoke("frpc:get-path"),
    setPath: (path) => electron.ipcRenderer.invoke("frpc:set-path", path),
    verifyPath: (path) => electron.ipcRenderer.invoke("frpc:verify-path", path),
    onLog: (callback) => {
      const listener = (_event, entry) => callback(entry);
      electron.ipcRenderer.on("frpc:log", listener);
      return () => electron.ipcRenderer.removeListener("frpc:log", listener);
    }
  },
  // System operations
  system: {
    openFile: (filePath) => electron.ipcRenderer.invoke("system:open-file", filePath),
    openFolder: (folderPath) => electron.ipcRenderer.invoke("system:open-folder", folderPath),
    selectFile: (options) => electron.ipcRenderer.invoke("system:select-file", options),
    selectFolder: (options) => electron.ipcRenderer.invoke("system:select-folder", options),
    getAppPath: () => electron.ipcRenderer.invoke("system:get-app-path"),
    getPlatform: () => electron.ipcRenderer.invoke("system:get-platform")
  }
});
