import { create } from 'zustand'

export interface LogEntry {
    id: string
    timestamp: Date
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
}

interface LogStoreState {
    logs: LogEntry[]
    maxLogs: number
}

interface LogStoreActions {
    addLog: (entry: LogEntry) => void
    clearLogs: () => void
    clearLogsForConfig: (configId: string) => void
    getLogsForConfig: (configId: string) => LogEntry[]
    initLogListener: () => () => void
}

type LogStore = LogStoreState & LogStoreActions

export const useLogStore = create<LogStore>((set, get) => ({
    logs: [],
    maxLogs: 2000,

    addLog: (entry) => {
        set((state) => {
            const newLogs = [...state.logs, entry]
            // 限制日志数量
            if (newLogs.length > state.maxLogs) {
                return { logs: newLogs.slice(-state.maxLogs) }
            }
            return { logs: newLogs }
        })
    },

    clearLogs: () => {
        set({ logs: [] })
    },

    clearLogsForConfig: (configId) => {
        set((state) => ({
            logs: state.logs.filter((log) => log.id !== configId),
        }))
    },

    getLogsForConfig: (configId) => {
        return get().logs.filter((log) => log.id === configId)
    },

    initLogListener: () => {
        const unsubscribe = window.electronAPI.frpc.onLog((entry) => {
            get().addLog(entry as LogEntry)
        })
        return unsubscribe
    },
}))
