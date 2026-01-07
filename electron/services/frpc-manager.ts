import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { app } from 'electron'
import { EventEmitter } from 'events'
import { ConfigStore } from './config-store'
import { parse } from 'smol-toml'

export enum ConfigState {
  Unknown = 0,
  Started = 1,
  Stopped = 2,
  Starting = 3,
  Stopping = 4,
}

export interface FrpcStatus {
  id: string
  state: ConfigState
  pid?: number
  error?: string
  startTime?: Date
}

export interface ProxyStatus {
  name: string
  type: string
  status: 'running' | 'error' | 'unknown'
  remoteAddr?: string
  error?: string
}

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  message: string
}

export class FrpcManager extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map()
  private statuses: Map<string, FrpcStatus> = new Map()
  private configStore: ConfigStore
  private frpcPath: string

  constructor(configStore: ConfigStore) {
    super()
    this.configStore = configStore
    this.frpcPath = this.findFrpcBinary()
  }

  // Allow setting frpc path from outside
  setFrpcPath(frpcPath: string): void {
    this.frpcPath = frpcPath
  }

  getFrpcPath(): string {
    return this.frpcPath
  }

  private emitLog(id: string, level: 'info' | 'warn' | 'error', message: string) {
    const entry: LogEntry = {
      id,
      timestamp: new Date(),
      level,
      message: message.trim(),
    }
    this.emit('log', entry)
  }

  private findFrpcBinary(): string {
    // Check multiple locations for frpc binary
    const platform = os.platform()
    const binaryName = platform === 'win32' ? 'frpc.exe' : 'frpc'

    const searchPaths = [
      // App resources
      path.join(app.getAppPath(), 'resources', binaryName),
      path.join(app.getAppPath(), '..', 'resources', binaryName),
      // User data
      path.join(app.getPath('userData'), binaryName),
      // System PATH (we'll use 'frpc' directly)
      binaryName,
    ]

    for (const searchPath of searchPaths) {
      if (searchPath === binaryName || fs.existsSync(searchPath)) {
        return searchPath
      }
    }

    // Default to just 'frpc' and hope it's in PATH
    return binaryName
  }

  async start(id: string): Promise<void> {
    // Check if already running
    if (this.processes.has(id)) {
      const status = this.statuses.get(id)
      if (status?.state === ConfigState.Started || status?.state === ConfigState.Starting) {
        return
      }
    }

    // Update status to starting
    this.statuses.set(id, {
      id,
      state: ConfigState.Starting,
    })

    try {
      // Generate temp config file
      const configContent = this.configStore.generateFrpcConfig(id)
      const tempConfigPath = path.join(app.getPath('temp'), `frpc-${id}.toml`)

      // 验证生成的 TOML 配置
      try {
        const parsed = parse(configContent)
        const parsedData = parsed as Record<string, unknown>
        console.log(`[frpc:${id}] Generated config validation:`, {
          hasProxies: !!parsedData.proxies,
          hasVisitors: !!parsedData.visitors,
          proxyCount: Array.isArray(parsedData.proxies) ? parsedData.proxies.length : 0,
          visitorCount: Array.isArray(parsedData.visitors) ? parsedData.visitors.length : 0,
        })
        this.emitLog(id, 'info', `Configuration loaded: ${parsedData.proxyCount || 0} proxies, ${parsedData.visitorCount || 0} visitors`)
      } catch (error) {
        console.error(`[frpc:${id}] Generated invalid TOML:`, error)
        this.emitLog(id, 'error', `Failed to validate configuration: ${error}`)
        throw new Error(`Generated invalid TOML config: ${error}`)
      }

      // 写入临时配置文件
      fs.writeFileSync(tempConfigPath, configContent, 'utf-8')
      console.log(`[frpc:${id}] Config written to: ${tempConfigPath}`)

      // Start frpc process
      const proc = spawn(this.frpcPath, ['-c', tempConfigPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      })

      this.processes.set(id, proc)

      // Handle stdout
      proc.stdout?.on('data', (data: Buffer) => {
        const message = data.toString()
        console.log(`[frpc:${id}] ${message}`)
        this.emitLog(id, 'info', message)
      })

      // Handle stderr
      proc.stderr?.on('data', (data: Buffer) => {
        const message = data.toString()
        console.error(`[frpc:${id}] ${message}`)
        // Parse log level from frpc output (e.g., [W], [E])
        const level = message.includes('[E]') ? 'error' : message.includes('[W]') ? 'warn' : 'info'
        this.emitLog(id, level, message)
      })

      // Handle process exit
      proc.on('exit', (code) => {
        this.processes.delete(id)
        this.statuses.set(id, {
          id,
          state: ConfigState.Stopped,
          error: code !== 0 ? `Process exited with code ${code}` : undefined,
        })

        // Clean up temp config
        try {
          fs.unlinkSync(tempConfigPath)
        } catch {
          // Ignore errors
        }
      })

      proc.on('error', (err) => {
        this.processes.delete(id)
        this.statuses.set(id, {
          id,
          state: ConfigState.Stopped,
          error: err.message,
        })
      })

      // Wait a bit for process to start
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check if still running
      if (proc.exitCode === null) {
        this.statuses.set(id, {
          id,
          state: ConfigState.Started,
          pid: proc.pid,
          startTime: new Date(),
        })
      }
    } catch (error) {
      this.statuses.set(id, {
        id,
        state: ConfigState.Stopped,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  async stop(id: string): Promise<void> {
    const proc = this.processes.get(id)
    if (!proc) {
      this.statuses.set(id, { id, state: ConfigState.Stopped })
      return
    }

    this.statuses.set(id, { id, state: ConfigState.Stopping })

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        proc.kill('SIGKILL')
      }, 5000)

      proc.once('exit', () => {
        clearTimeout(timeout)
        this.processes.delete(id)
        this.statuses.set(id, { id, state: ConfigState.Stopped })
        resolve()
      })

      // Send SIGTERM first
      proc.kill('SIGTERM')
    })
  }

  async restart(id: string): Promise<void> {
    await this.stop(id)
    await this.start(id)
  }

  async reload(id: string): Promise<void> {
    const proc = this.processes.get(id)
    if (!proc) {
      // Not running, just start it
      await this.start(id)
      return
    }

    // Regenerate config and restart
    // Note: frpc supports SIGUSR1 for reload on Unix, but for simplicity we restart
    await this.restart(id)
  }

  getStatus(id: string): FrpcStatus {
    return (
      this.statuses.get(id) || {
        id,
        state: ConfigState.Stopped,
      }
    )
  }

  async getProxyStatus(id: string): Promise<ProxyStatus[]> {
    // In a real implementation, this would query the frpc admin API
    // For now, return empty array
    const status = this.statuses.get(id)
    if (!status || status.state !== ConfigState.Started) {
      return []
    }

    // TODO: Query frpc admin API for proxy status
    // This requires admin server to be configured in frpc
    return []
  }

  stopAll(): void {
    for (const [id, proc] of this.processes) {
      try {
        proc.kill('SIGTERM')
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL')
          }
        }, 2000)
      } catch {
        // Ignore errors
      }
      this.statuses.set(id, { id, state: ConfigState.Stopped })
    }
    this.processes.clear()
  }

  isRunning(id: string): boolean {
    const status = this.statuses.get(id)
    return status?.state === ConfigState.Started || status?.state === ConfigState.Starting
  }
}
