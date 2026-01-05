import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/ui/status-badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useConfigStore } from '@/stores/config-store'
import { ProxyList } from '../proxy/proxy-list'
import { VisitorList } from '../proxy/visitor-list'
import { ProxyDialog } from '../proxy/proxy-dialog'
import { VisitorDialog } from '../proxy/visitor-dialog'
import { ConfigState, type Proxy as ProxyType, type Visitor } from '@/types'
import { toast } from 'sonner'

export function ConfigDetail() {
    const { t } = useTranslation()
    const {
        getSelectedConfig,
        configStates,
        proxyStatuses,
        startConfig,
        stopConfig,
        restartConfig,
        reloadConfig,
        updateConfig,
    } = useConfigStore()

    const config = getSelectedConfig()
    const [showProxyDialog, setShowProxyDialog] = useState(false)
    const [editProxy, setEditProxy] = useState<ProxyType | null>(null)
    const [showVisitorDialog, setShowVisitorDialog] = useState(false)
    const [editVisitor, setEditVisitor] = useState<Visitor | null>(null)
    const [activeTab, setActiveTab] = useState<'proxies' | 'visitors' | 'settings'>('proxies')

    if (!config) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                {t('config.selectConfig')}
            </div>
        )
    }

    const state = configStates.get(config.id) || ConfigState.Stopped
    const isRunning = state === ConfigState.Started || state === ConfigState.Starting
    const proxies = proxyStatuses.get(config.id) || []

    const getStateInfo = () => {
        switch (state) {
            case ConfigState.Started:
                return { status: 'running' as const, label: t('status.running') }
            case ConfigState.Starting:
                return { status: 'starting' as const, label: t('status.starting') }
            case ConfigState.Stopping:
                return { status: 'stopping' as const, label: t('status.stopping') }
            default:
                return { status: 'stopped' as const, label: t('status.stopped') }
        }
    }

    const handleStart = async () => {
        try {
            await startConfig(config.id)
            toast.success(t('config.configStarted'))
        } catch (error) {
            toast.error(t('config.startFailed'), {
                description: String(error)
            })
        }
    }

    const handleStop = async () => {
        try {
            await stopConfig(config.id)
            toast.success(t('config.configStopped'))
        } catch (error) {
            toast.error(t('config.stopFailed'), {
                description: String(error)
            })
        }
    }

    const handleRestart = async () => {
        try {
            await restartConfig(config.id)
            toast.success(t('config.configRestarted'))
        } catch (error) {
            toast.error(t('config.restartFailed'), {
                description: String(error)
            })
        }
    }

    const handleReload = async () => {
        try {
            await reloadConfig(config.id)
            toast.success(t('config.configReloaded'))
        } catch (error) {
            toast.error(t('config.reloadFailed'), {
                description: String(error)
            })
        }
    }

    const handleSaveProxy = async (proxy: ProxyType) => {
        try {
            const updatedProxies = editProxy
                ? config.proxies.map((p) => (p.name === editProxy.name ? proxy : p))
                : [...config.proxies, proxy]

            await updateConfig({
                ...config,
                proxies: updatedProxies,
            })

            toast.success(editProxy ? t('proxy.proxyUpdated') : t('proxy.proxyAdded'))
            setShowProxyDialog(false)
            setEditProxy(null)

            // If running, reload config
            if (isRunning) {
                await handleReload()
            }
        } catch (error) {
            toast.error(t('config.saveFailed'), {
                description: String(error)
            })
        }
    }

    const handleDeleteProxy = async (proxyName: string) => {
        try {
            await updateConfig({
                ...config,
                proxies: config.proxies.filter((p) => p.name !== proxyName),
            })
            toast.success(t('proxy.proxyDeleted'))

            // If running, reload config
            if (isRunning) {
                await handleReload()
            }
        } catch (error) {
            toast.error(t('config.deleteFailed'), {
                description: String(error)
            })
        }
    }

    const handleEditProxy = (proxy: ProxyType) => {
        setEditProxy(proxy)
        setShowProxyDialog(true)
    }

    const handleSaveVisitor = async (visitor: Visitor) => {
        try {
            const updatedVisitors = editVisitor
                ? (config.visitors || []).map((v) => (v.name === editVisitor.name ? visitor : v))
                : [...(config.visitors || []), visitor]

            await updateConfig({
                ...config,
                visitors: updatedVisitors,
            })

            toast.success(editVisitor ? t('visitor.visitorUpdated') : t('visitor.visitorAdded'))
            setShowVisitorDialog(false)
            setEditVisitor(null)

            // If running, reload config
            if (isRunning) {
                await handleReload()
            }
        } catch (error) {
            toast.error(t('config.saveFailed'), {
                description: String(error)
            })
        }
    }

    const handleDeleteVisitor = async (visitorName: string) => {
        try {
            await updateConfig({
                ...config,
                visitors: (config.visitors || []).filter((v) => v.name !== visitorName),
            })
            toast.success(t('visitor.visitorDeleted'))

            // If running, reload config
            if (isRunning) {
                await handleReload()
            }
        } catch (error) {
            toast.error(t('config.deleteFailed'), {
                description: String(error)
            })
        }
    }

    const handleEditVisitor = (visitor: Visitor) => {
        setEditVisitor(visitor)
        setShowVisitorDialog(true)
    }

    const stateInfo = getStateInfo()

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{config.name}</h2>
                    <StatusBadge status={stateInfo.status} label={stateInfo.label} />
                </div>
                <div className="flex items-center gap-2">
                    {isRunning ? (
                        <>
                            <Button variant="outline" size="sm" onClick={handleStop}>
                                <Square className="w-4 h-4 mr-2" />
                                {t('common.stop')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleRestart}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {t('common.restart')}
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" onClick={handleStart}>
                            <Play className="w-4 h-4 mr-2" />
                            {t('common.start')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Server Info */}
            <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">{t('server.serverAddr')}：</span>
                        <span className="ml-1">{config.common.serverAddr}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">{t('server.serverPort')}：</span>
                        <span className="ml-1">{config.common.serverPort}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">{t('server.protocol')}：</span>
                        <span className="ml-1">{config.common.protocol || 'tcp'}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'proxies' | 'visitors' | 'settings')} className="flex flex-col flex-1 min-h-0">
                <div className="px-4 border-b shrink-0">
                    <TabsList className="grid w-full h-10 grid-cols-3">
                        <TabsTrigger value="proxies">
                            {t('proxy.title')} ({config.proxies.length})
                        </TabsTrigger>
                        <TabsTrigger value="visitors">
                            {t('visitor.title')} ({config.visitors?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="settings">{t('proxy.configDetails')}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="proxies" className="flex-1 mt-0 p-0 flex flex-col min-h-0 data-[state=inactive]:hidden">
                    <div className="flex items-center justify-between p-4 border-b shrink-0">
                        <span className="text-sm text-muted-foreground">
                            {t('proxy.manageProxyRules')}
                        </span>
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditProxy(null)
                                setShowProxyDialog(true)
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('proxy.addProxy')}
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <ProxyList
                            proxies={config.proxies}
                            proxyStatuses={proxies}
                            onEdit={handleEditProxy}
                            onDelete={handleDeleteProxy}
                        />
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="visitors" className="flex-1 mt-0 p-0 flex flex-col min-h-0 data-[state=inactive]:hidden">
                    <div className="flex items-center justify-between p-4 border-b shrink-0">
                        <span className="text-sm text-muted-foreground">
                            {t('visitor.manageVisitorRules')}
                        </span>
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditVisitor(null)
                                setShowVisitorDialog(true)
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('visitor.addVisitor')}
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <VisitorList
                            visitors={config.visitors || []}
                            onEdit={handleEditVisitor}
                            onDelete={handleDeleteVisitor}
                        />
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="flex-1 mt-0 p-0 min-h-0 data-[state=inactive]:hidden">
                    <ScrollArea className="h-full p-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoItem label={t('server.serverAddr')} value={config.common.serverAddr} />
                                <InfoItem label={t('server.serverPort')} value={String(config.common.serverPort)} />
                                <InfoItem label={t('server.protocol')} value={config.common.protocol || 'tcp'} />
                                <InfoItem label={t('auth.method')} value={config.common.auth?.method || t('auth.noAuth')} />
                                <InfoItem label={t('advanced.tcpMux')} value={config.common.tcpMux ? t('common.enabled') : t('common.disabled')} />
                                <InfoItem label="TLS" value={config.common.tls?.enable ? t('common.enabled') : t('common.disabled')} />
                                <InfoItem label={t('advanced.heartbeatInterval')} value={`${config.common.heartbeatInterval || 30}s`} />
                                <InfoItem label={t('advanced.logLevel')} value={config.common.log?.level || 'info'} />
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>

            {/* Proxy Dialog */}
            <ProxyDialog
                open={showProxyDialog}
                onOpenChange={setShowProxyDialog}
                proxy={editProxy}
                onSave={handleSaveProxy}
            />

            {/* Visitor Dialog */}
            <VisitorDialog
                open={showVisitorDialog}
                onOpenChange={setShowVisitorDialog}
                visitor={editVisitor}
                onSave={handleSaveVisitor}
            />
        </div>
    )
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <span className="text-sm text-muted-foreground">{label}</span>
            <p className="text-sm font-medium">{value}</p>
        </div>
    )
}
