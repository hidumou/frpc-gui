import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfigStore } from '@/stores/config-store'
import { useLogStore, type LogEntry } from '@/stores/log-store'
import { Trash2, Download } from 'lucide-react'

function LogsPage() {
    const { t } = useTranslation()
    const { configs } = useConfigStore()
    const { logs, clearLogs } = useLogStore()
    const [selectedConfigId, setSelectedConfigId] = useState<string>('all')
    const scrollRef = useRef<HTMLDivElement>(null)
    const autoScrollRef = useRef(true)

    // 自动滚动到底部
    useEffect(() => {
        if (autoScrollRef.current && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    // 过滤日志
    const filteredLogs = selectedConfigId === 'all'
        ? logs
        : logs.filter(log => log.id === selectedConfigId)

    const exportLogs = () => {
        const content = filteredLogs.map(l =>
            `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] [${l.id}] ${l.message}`
        ).join('\n')
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `frp-gui-logs-${new Date().toISOString().split('T')[0]}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    const getLevelColor = (level: LogEntry['level']) => {
        switch (level) {
            case 'error': return 'text-red-500'
            case 'warn': return 'text-yellow-500'
            case 'info': return 'text-blue-500'
            case 'debug': return 'text-gray-500'
            default: return 'text-foreground'
        }
    }

    // 获取配置名称
    const getConfigName = (id: string) => {
        const config = configs.find(c => c.id === id)
        return config?.name || id.slice(0, 8)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">{t('logs.title')}</h2>
                    <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder={t('logs.selectConfig')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('logs.allLogs')}</SelectItem>
                            {configs.map(config => (
                                <SelectItem key={config.id} value={config.id}>
                                    {config.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportLogs}>
                        <Download className="w-4 h-4 mr-2" />
                        {t('common.export')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearLogs}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('logs.clear')}
                    </Button>
                </div>
            </div>

            {/* Log content */}
            <ScrollArea className="flex-1">
                <div
                    ref={scrollRef}
                    className="p-4 space-y-1 font-mono text-sm"
                    onScroll={(e) => {
                        const target = e.target as HTMLDivElement
                        const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50
                        autoScrollRef.current = isAtBottom
                    }}
                >
                    {filteredLogs.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            {t('logs.noLogs')}
                        </div>
                    ) : (
                        filteredLogs.map((log, index) => (
                            <div key={index} className="flex gap-2 px-1 rounded hover:bg-muted/50">
                                <span className="text-muted-foreground shrink-0">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                                <span className={`${getLevelColor(log.level)} shrink-0`}>
                                    [{log.level.toUpperCase().padEnd(5)}]
                                </span>
                                <span className="text-muted-foreground shrink-0">
                                    [{getConfigName(log.id)}]
                                </span>
                                <span className="break-all whitespace-pre-wrap">{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

export const Route = createFileRoute('/logs')({
    component: LogsPage,
})
