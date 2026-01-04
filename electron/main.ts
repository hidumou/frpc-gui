import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import { ConfigStore } from './services/config-store'
import { FrpcManager, LogEntry } from './services/frpc-manager'

// 禁用硬件加速以避免一些渲染问题
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const configStore = new ConfigStore()
const frpcManager = new FrpcManager(configStore)

// 转发日志到渲染进程
frpcManager.on('log', (entry: LogEntry) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('frpc:log', entry)
  }
})

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 最小化到托盘
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        frpcManager.stopAll()
        app.quit()
      },
    },
  ])

  tray.setToolTip('FRPC GUI')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
}

// IPC handlers - Config
ipcMain.handle('config:list', async () => {
  return configStore.listConfigs()
})

ipcMain.handle('config:load', async (_event, id: string) => {
  return configStore.loadConfig(id)
})

ipcMain.handle('config:save', async (_event, config) => {
  return configStore.saveConfig(config)
})

ipcMain.handle('config:delete', async (_event, id: string) => {
  await frpcManager.stop(id)
  return configStore.deleteConfig(id)
})

ipcMain.handle('config:import', async (_event, filePath: string) => {
  return configStore.importConfig(filePath)
})

ipcMain.handle('config:import-text', async (_event, content: string, name?: string) => {
  return configStore.importConfigFromText(content, name)
})

ipcMain.handle('config:export', async (_event, id: string, filePath: string) => {
  return configStore.exportConfig(id, filePath)
})

// IPC handlers - FRPC
ipcMain.handle('frpc:start', async (_event, id: string) => {
  return frpcManager.start(id)
})

ipcMain.handle('frpc:stop', async (_event, id: string) => {
  return frpcManager.stop(id)
})

ipcMain.handle('frpc:restart', async (_event, id: string) => {
  return frpcManager.restart(id)
})

ipcMain.handle('frpc:reload', async (_event, id: string) => {
  return frpcManager.reload(id)
})

ipcMain.handle('frpc:status', async (_event, id: string) => {
  return frpcManager.getStatus(id)
})

ipcMain.handle('frpc:proxy-status', async (_event, id: string) => {
  return frpcManager.getProxyStatus(id)
})

// IPC handlers - System
ipcMain.handle('system:open-file', async (_event, filePath: string) => {
  return shell.openPath(filePath)
})

ipcMain.handle('system:open-folder', async (_event, folderPath: string) => {
  return shell.showItemInFolder(folderPath)
})

ipcMain.handle('system:select-file', async (_event, options: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    ...options,
    properties: ['openFile'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('system:select-folder', async (_event, options: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    ...options,
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('system:get-app-path', async () => {
  return {
    userData: app.getPath('userData'),
    logs: app.getPath('logs'),
    temp: app.getPath('temp'),
  }
})

ipcMain.handle('system:get-platform', async () => {
  return process.platform
})

// IPC handlers - FRPC Binary Management
ipcMain.handle('frpc:check', async () => {
  return checkFrpcAvailable()
})

ipcMain.handle('frpc:get-path', async () => {
  return getFrpcPath()
})

ipcMain.handle('frpc:set-path', async (_event, frpcPath: string) => {
  return setFrpcPath(frpcPath)
})

ipcMain.handle('frpc:verify-path', async (_event, frpcPath: string) => {
  return verifyFrpcPath(frpcPath)
})

// FRPC path management
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function loadSettings(): { frpcPath?: string } {
  try {
    const settingsPath = getSettingsPath()
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
  return {}
}

function saveSettings(settings: { frpcPath?: string }): void {
  try {
    const settingsPath = getSettingsPath()
    const existing = loadSettings()
    fs.writeFileSync(settingsPath, JSON.stringify({ ...existing, ...settings }, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

function getFrpcPath(): string | null {
  const settings = loadSettings()
  return settings.frpcPath || null
}

function setFrpcPath(frpcPath: string): boolean {
  const result = verifyFrpcPath(frpcPath)
  if (result.valid) {
    saveSettings({ frpcPath })
    // Update FrpcManager's path
    frpcManager.setFrpcPath(frpcPath)
    return true
  }
  return false
}

function verifyFrpcPath(frpcPath: string): { valid: boolean; version?: string; error?: string } {
  try {
    // Check if file exists
    if (!fs.existsSync(frpcPath)) {
      return { valid: false, error: 'File not found' }
    }

    // Try to execute frpc -v
    const output = execSync(`"${frpcPath}" -v`, {
      timeout: 5000,
      encoding: 'utf-8',
      windowsHide: true,
    })

    // Parse version from output (e.g., "frpc version 0.52.3")
    const versionMatch = output.match(/frpc version (\d+\.\d+\.\d+)/i) || output.match(/(\d+\.\d+\.\d+)/)
    const version = versionMatch ? versionMatch[1] : output.trim()

    return { valid: true, version }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function checkFrpcAvailable(): { available: boolean; version?: string; path?: string; error?: string } {
  // First check saved path
  const savedPath = getFrpcPath()
  if (savedPath) {
    const result = verifyFrpcPath(savedPath)
    if (result.valid) {
      return { available: true, version: result.version, path: savedPath }
    }
  }

  // Try to find frpc in common locations
  const platform = os.platform()
  const binaryName = platform === 'win32' ? 'frpc.exe' : 'frpc'

  const searchPaths = [
    // App resources
    path.join(app.getAppPath(), 'resources', binaryName),
    path.join(app.getAppPath(), '..', 'resources', binaryName),
    // User data
    path.join(app.getPath('userData'), binaryName),
  ]

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const result = verifyFrpcPath(searchPath)
      if (result.valid) {
        // Save this path
        saveSettings({ frpcPath: searchPath })
        return { available: true, version: result.version, path: searchPath }
      }
    }
  }

  // Try system PATH
  try {
    const output = execSync(`${binaryName} -v`, {
      timeout: 5000,
      encoding: 'utf-8',
      windowsHide: true,
    })
    const versionMatch = output.match(/frpc version (\d+\.\d+\.\d+)/i) || output.match(/(\d+\.\d+\.\d+)/)
    const version = versionMatch ? versionMatch[1] : output.trim()
    return { available: true, version, path: binaryName }
  } catch {
    return { available: false, error: 'frpc not found in PATH' }
  }
}

// App lifecycle
app.whenReady().then(() => {
  // Initialize frpc path from saved settings
  const savedPath = getFrpcPath()
  if (savedPath) {
    frpcManager.setFrpcPath(savedPath)
  }

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    frpcManager.stopAll()
    app.quit()
  }
})

app.on('before-quit', () => {
  frpcManager.stopAll()
})
