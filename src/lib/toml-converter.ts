import { parse, stringify } from 'smol-toml'
import type { ClientConfig } from '@/types'

/**
 * 将 ClientConfig 转换为干净的 TOML 字符串
 * 不包含管理器特定的字段（如 _frpgui_name, disabled）
 */
export function generateTomlFromConfig(config: ClientConfig): string {
  const tomlData: Record<string, unknown> = {
    ...config.common,
  }

  // 添加代理配置，过滤 UI 字段
  if (config.proxies && config.proxies.length > 0) {
    tomlData.proxies = config.proxies.map((proxy) => {
      const { disabled, ...proxyData } = proxy as Record<string, unknown>
      return proxyData
    })
  }

  // 添加访问者配置，过滤 UI 字段
  if (config.visitors && config.visitors.length > 0) {
    tomlData.visitors = config.visitors.map((visitor) => {
      const { disabled, ...visitorData } = visitor as Record<string, unknown>
      return visitorData
    })
  }

  return stringify(tomlData)
}

/**
 * 将 TOML 字符串解析为 ClientConfig
 */
export function parseTomlToConfig(toml: string, id: string, name?: string): ClientConfig {
  const parsed = parse(toml)
  const { proxies, visitors, ...common } = parsed as Record<string, unknown>

  return {
    id,
    name: name || (common._frpgui_name as string) || (common.serverAddr as string) || 'Config',
    common: common as ClientConfig['common'],
    proxies: (proxies as ClientConfig['proxies']) || [],
    visitors: (visitors as ClientConfig['visitors']) || [],
  }
}

/**
 * 验证 TOML 格式
 */
export function validateToml(toml: string): { valid: boolean; error?: string; data?: Record<string, unknown> } {
  try {
    const parsed = parse(toml)
    return { valid: true, data: parsed as Record<string, unknown> }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
