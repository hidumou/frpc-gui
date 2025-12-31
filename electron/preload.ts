import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Config operations
  config: {
    list: () => ipcRenderer.invoke('config:list'),
    load: (id: string) => ipcRenderer.invoke('config:load', id),
    save: (config: unknown) => ipcRenderer.invoke('config:save', config),
    delete: (id: string) => ipcRenderer.invoke('config:delete', id),
    import: (filePath: string) => ipcRenderer.invoke('config:import', filePath),
    importText: (content: string, name?: string) => ipcRenderer.invoke('config:import-text', content, name),
    export: (id: string, filePath: string) => ipcRenderer.invoke('config:export', id, filePath),
  },

  // FRPC operations
  frpc: {
    start: (id: string) => ipcRenderer.invoke('frpc:start', id),
    stop: (id: string) => ipcRenderer.invoke('frpc:stop', id),
    restart: (id: string) => ipcRenderer.invoke('frpc:restart', id),
    reload: (id: string) => ipcRenderer.invoke('frpc:reload', id),
    getStatus: (id: string) => ipcRenderer.invoke('frpc:status', id),
    getProxyStatus: (id: string) => ipcRenderer.invoke('frpc:proxy-status', id),
    onLog: (callback: (entry: unknown) => void) => {
      const listener = (_event: unknown, entry: unknown) => callback(entry)
      ipcRenderer.on('frpc:log', listener)
      return () => ipcRenderer.removeListener('frpc:log', listener)
    },
  },

  // System operations
  system: {
    openFile: (filePath: string) => ipcRenderer.invoke('system:open-file', filePath),
    openFolder: (folderPath: string) => ipcRenderer.invoke('system:open-folder', folderPath),
    selectFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) =>
      ipcRenderer.invoke('system:select-file', options),
    selectFolder: (options?: { title?: string }) =>
      ipcRenderer.invoke('system:select-folder', options),
    getAppPath: () => ipcRenderer.invoke('system:get-app-path'),
    getPlatform: () => ipcRenderer.invoke('system:get-platform'),
  },
})

// Log entry type
export interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  message: string
}

// Type definitions for the exposed API
export interface ElectronAPI {
  config: {
    list: () => Promise<unknown[]>
    load: (id: string) => Promise<unknown>
    save: (config: unknown) => Promise<void>
    delete: (id: string) => Promise<void>
    import: (filePath: string) => Promise<unknown>
    importText: (content: string, name?: string) => Promise<unknown>
    export: (id: string, filePath: string) => Promise<void>
  }
  frpc: {
    start: (id: string) => Promise<void>
    stop: (id: string) => Promise<void>
    restart: (id: string) => Promise<void>
    reload: (id: string) => Promise<void>
    getStatus: (id: string) => Promise<unknown>
    getProxyStatus: (id: string) => Promise<unknown[]>
    onLog: (callback: (entry: LogEntry) => void) => () => void
  }
  system: {
    openFile: (filePath: string) => Promise<string>
    openFolder: (folderPath: string) => Promise<void>
    selectFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>
    selectFolder: (options?: { title?: string }) => Promise<string | null>
    getAppPath: () => Promise<{ userData: string; logs: string; temp: string }>
    getPlatform: () => Promise<NodeJS.Platform>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
