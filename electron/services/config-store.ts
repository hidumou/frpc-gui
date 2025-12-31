import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { parse, stringify } from 'smol-toml'
import { v4 as uuidv4 } from 'uuid'

export interface ClientConfig {
  id: string
  name: string
  common: Record<string, unknown>
  proxies: Record<string, unknown>[]
  visitors?: Record<string, unknown>[]
  manualStart?: boolean
  path?: string
}

export class ConfigStore {
  private configDir: string
  private configs: Map<string, ClientConfig> = new Map()

  constructor() {
    this.configDir = path.join(app.getPath('userData'), 'configs')
    this.ensureConfigDir()
    this.loadAllConfigs()
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true })
    }
  }

  private generateId(): string {
    return uuidv4()
  }

  private loadAllConfigs(): void {
    const files = fs.readdirSync(this.configDir).filter((f) => f.endsWith('.toml'))

    for (const file of files) {
      try {
        const filePath = path.join(this.configDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const parsed = parse(content)
        const id = path.basename(file, '.toml')

        // Extract common config and proxies
        const { proxies, visitors, ...common } = parsed as Record<string, unknown>

        const config: ClientConfig = {
          id,
          name: (common.serverAddr as string) || file,
          common,
          proxies: (proxies as Record<string, unknown>[]) || [],
          visitors: (visitors as Record<string, unknown>[]) || [],
          path: filePath,
        }

        // Check for manager-specific fields
        if (common._frpgui_name) {
          config.name = common._frpgui_name as string
          delete config.common._frpgui_name
        }
        if (common._frpgui_manual_start) {
          config.manualStart = common._frpgui_manual_start as boolean
          delete config.common._frpgui_manual_start
        }

        this.configs.set(id, config)
      } catch (error) {
        console.error(`Failed to load config ${file}:`, error)
      }
    }
  }

  listConfigs(): ClientConfig[] {
    return Array.from(this.configs.values())
  }

  loadConfig(id: string): ClientConfig | null {
    return this.configs.get(id) || null
  }

  saveConfig(config: ClientConfig): ClientConfig {
    if (!config.id) {
      config.id = this.generateId()
    }

    const filePath = path.join(this.configDir, `${config.id}.toml`)
    config.path = filePath

    // Build TOML structure
    const tomlData: Record<string, unknown> = {
      ...config.common,
      _frpgui_name: config.name,
      _frpgui_manual_start: config.manualStart || false,
    }

    if (config.proxies && config.proxies.length > 0) {
      tomlData.proxies = config.proxies
    }

    if (config.visitors && config.visitors.length > 0) {
      tomlData.visitors = config.visitors
    }

    const content = stringify(tomlData)
    fs.writeFileSync(filePath, content, 'utf-8')

    this.configs.set(config.id, config)
    return config
  }

  deleteConfig(id: string): void {
    const config = this.configs.get(id)
    if (config && config.path) {
      if (fs.existsSync(config.path)) {
        fs.unlinkSync(config.path)
      }
    }
    this.configs.delete(id)
  }

  importConfig(filePath: string): ClientConfig {
    const content = fs.readFileSync(filePath, 'utf-8')
    const parsed = parse(content)
    const id = this.generateId()

    const { proxies, visitors, ...common } = parsed as Record<string, unknown>

    const config: ClientConfig = {
      id,
      name: (common._frpgui_name as string) || path.basename(filePath, path.extname(filePath)),
      common,
      proxies: (proxies as Record<string, unknown>[]) || [],
      visitors: (visitors as Record<string, unknown>[]) || [],
    }

    return this.saveConfig(config)
  }

  importConfigFromText(content: string, name?: string): ClientConfig {
    const parsed = parse(content)
    const id = this.generateId()

    const { proxies, visitors, ...common } = parsed as Record<string, unknown>

    const config: ClientConfig = {
      id,
      name: name || (common._frpgui_name as string) || (common.serverAddr as string) || 'Imported Config',
      common,
      proxies: (proxies as Record<string, unknown>[]) || [],
      visitors: (visitors as Record<string, unknown>[]) || [],
    }

    return this.saveConfig(config)
  }

  exportConfig(id: string, filePath: string): void {
    const config = this.configs.get(id)
    if (!config) {
      throw new Error(`Config ${id} not found`)
    }

    // Build clean TOML without manager-specific fields
    const tomlData: Record<string, unknown> = {
      ...config.common,
    }

    // Remove manager-specific fields
    delete tomlData._frpgui_name
    delete tomlData._frpgui_manual_start

    if (config.proxies && config.proxies.length > 0) {
      tomlData.proxies = config.proxies
    }

    if (config.visitors && config.visitors.length > 0) {
      tomlData.visitors = config.visitors
    }

    const content = stringify(tomlData)
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  getConfigPath(id: string): string | null {
    const config = this.configs.get(id)
    return config?.path || null
  }

  generateFrpcConfig(id: string): string {
    const config = this.configs.get(id)
    if (!config) {
      throw new Error(`Config ${id} not found`)
    }

    // Generate a clean frpc config file
    const tomlData: Record<string, unknown> = {
      ...config.common,
    }

    // Remove manager-specific fields
    delete tomlData._frpgui_name
    delete tomlData._frpgui_manual_start

    if (config.proxies && config.proxies.length > 0) {
      tomlData.proxies = config.proxies
    }

    if (config.visitors && config.visitors.length > 0) {
      tomlData.visitors = config.visitors
    }

    return stringify(tomlData)
  }
}