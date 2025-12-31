export * from './config'

// IPC channel names
export const IPC_CHANNELS = {
  // Config
  CONFIG_LIST: 'config:list',
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',
  CONFIG_DELETE: 'config:delete',
  CONFIG_IMPORT: 'config:import',
  CONFIG_EXPORT: 'config:export',
  // FRPC
  FRPC_START: 'frpc:start',
  FRPC_STOP: 'frpc:stop',
  FRPC_RESTART: 'frpc:restart',
  FRPC_RELOAD: 'frpc:reload',
  FRPC_STATUS: 'frpc:status',
  FRPC_PROXY_STATUS: 'frpc:proxy-status',
  FRPC_LOG: 'frpc:log',
  // System
  SYSTEM_OPEN_FILE: 'system:open-file',
  SYSTEM_OPEN_FOLDER: 'system:open-folder',
  SYSTEM_SELECT_FILE: 'system:select-file',
  SYSTEM_SELECT_FOLDER: 'system:select-folder',
  SYSTEM_GET_APP_PATH: 'system:get-app-path',
  SYSTEM_GET_PLATFORM: 'system:get-platform',
} as const
