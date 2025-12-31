import { create } from 'zustand'
import type { ClientConfig, ConfigState, ProxyStatusInfo } from '@/types'

interface ConfigStoreState {
  configs: ClientConfig[]
  selectedConfigId: string | null
  configStates: Map<string, ConfigState>
  proxyStatuses: Map<string, ProxyStatusInfo[]>
  isLoading: boolean
  error: string | null
}

interface ConfigStoreActions {
  // Config operations
  loadConfigs: () => Promise<void>
  addConfig: (config: Partial<ClientConfig>) => Promise<ClientConfig>
  updateConfig: (config: ClientConfig) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  selectConfig: (id: string | null) => void
  importConfig: (filePath: string) => Promise<void>
  exportConfig: (id: string, filePath: string) => Promise<void>

  // FRPC operations
  startConfig: (id: string) => Promise<void>
  stopConfig: (id: string) => Promise<void>
  restartConfig: (id: string) => Promise<void>
  reloadConfig: (id: string) => Promise<void>
  refreshStatus: (id: string) => Promise<void>
  refreshAllStatuses: () => Promise<void>

  // Helpers
  getSelectedConfig: () => ClientConfig | null
  setError: (error: string | null) => void
}

type ConfigStore = ConfigStoreState & ConfigStoreActions

export const useConfigStore = create<ConfigStore>((set, get) => ({
  // State
  configs: [],
  selectedConfigId: null,
  configStates: new Map(),
  proxyStatuses: new Map(),
  isLoading: false,
  error: null,

  // Config operations
  loadConfigs: async () => {
    set({ isLoading: true, error: null })
    try {
      const configs = await window.electronAPI.config.list()
      set({ configs: configs as ClientConfig[], isLoading: false })

      // Refresh all statuses
      await get().refreshAllStatuses()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load configs',
        isLoading: false,
      })
    }
  },

  addConfig: async (config) => {
    set({ isLoading: true, error: null })
    try {
      const newConfig = await window.electronAPI.config.save(config)
      set((state) => ({
        configs: [...state.configs, newConfig as ClientConfig],
        isLoading: false,
      }))
      return newConfig as ClientConfig
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add config',
        isLoading: false,
      })
      throw error
    }
  },

  updateConfig: async (config) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.config.save(config)
      set((state) => ({
        configs: state.configs.map((c) => (c.id === config.id ? config : c)),
        isLoading: false,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update config',
        isLoading: false,
      })
      throw error
    }
  },

  deleteConfig: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.config.delete(id)
      set((state) => ({
        configs: state.configs.filter((c) => c.id !== id),
        selectedConfigId: state.selectedConfigId === id ? null : state.selectedConfigId,
        isLoading: false,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete config',
        isLoading: false,
      })
      throw error
    }
  },

  selectConfig: (id) => {
    set({ selectedConfigId: id })
  },

  importConfig: async (filePath) => {
    set({ isLoading: true, error: null })
    try {
      const config = await window.electronAPI.config.import(filePath)
      set((state) => ({
        configs: [...state.configs, config as ClientConfig],
        isLoading: false,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to import config',
        isLoading: false,
      })
      throw error
    }
  },

  exportConfig: async (id, filePath) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.config.export(id, filePath)
      set({ isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to export config',
        isLoading: false,
      })
      throw error
    }
  },

  // FRPC operations
  startConfig: async (id) => {
    try {
      await window.electronAPI.frpc.start(id)
      await get().refreshStatus(id)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start config',
      })
      throw error
    }
  },

  stopConfig: async (id) => {
    try {
      await window.electronAPI.frpc.stop(id)
      await get().refreshStatus(id)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to stop config',
      })
      throw error
    }
  },

  restartConfig: async (id) => {
    try {
      await window.electronAPI.frpc.restart(id)
      await get().refreshStatus(id)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to restart config',
      })
      throw error
    }
  },

  reloadConfig: async (id) => {
    try {
      await window.electronAPI.frpc.reload(id)
      await get().refreshStatus(id)
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reload config',
      })
      throw error
    }
  },

  refreshStatus: async (id) => {
    try {
      const status = await window.electronAPI.frpc.getStatus(id)
      const proxyStatus = await window.electronAPI.frpc.getProxyStatus(id)

      set((state) => {
        const newStates = new Map(state.configStates)
        const newProxyStatuses = new Map(state.proxyStatuses)

        newStates.set(id, (status as { state: ConfigState }).state)
        newProxyStatuses.set(id, proxyStatus as ProxyStatusInfo[])

        return {
          configStates: newStates,
          proxyStatuses: newProxyStatuses,
        }
      })
    } catch (error) {
      console.error(`Failed to refresh status for ${id}:`, error)
    }
  },

  refreshAllStatuses: async () => {
    const { configs } = get()
    await Promise.all(configs.map((c) => get().refreshStatus(c.id)))
  },

  // Helpers
  getSelectedConfig: () => {
    const { configs, selectedConfigId } = get()
    return configs.find((c) => c.id === selectedConfigId) || null
  },

  setError: (error) => {
    set({ error })
  },
}))
