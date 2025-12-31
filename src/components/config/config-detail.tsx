import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useConfigStore } from '@/stores/config-store'
import { ProxyList } from '../proxy/proxy-list'
import { VisitorList } from '../proxy/visitor-list'
import { ProxyDialog } from '../proxy/proxy-dialog'
import { ConfigState, type Proxy as ProxyType } from '@/types'
import { useToast } from '@/components/ui/use-toast'

export function ConfigDetail() {
    const { t } = useTranslation()
    const { toast } = useToast()
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
                return { label: t('status.running'), variant: 'success' as const }
            case ConfigState.Starting:
                return { label: t('status.starting'), variant: 'warning' as const }
            case ConfigState.Stopping:
                return { label: t('status.stopping'), variant: 'warning' as const }
            default:
                return { label: t('status.stopped'), variant: 'secondary' as const }
        }
    }

    const handleStart = async () => {
        try {
            await startConfig(config.id)
            toast({ title: t('config.configStarted') })
        } catch (error) {
            toast({ title: t('config.startFailed'), description: String(error), variant: 'destructive' })
        }
    }

    const handleStop = async () => {
        try {
            await stopConfig(config.id)
            toast({ title: t('config.configStopped') })
        } catch (error) {
            toast({ title: t('config.stopFailed'), description: String(error), variant: 'destructive' })
        }
    }

    const handleRestart = async () => {
        try {
            await restartConfig(config.id)
            toast({ title: t('config.configRestarted') })
        } catch (error) {
            toast({ title: t('config.restartFailed'), description: String(error), variant: 'destructive' })
        }
    }

    const handleReload = async () => {
        try {
            await reloadConfig(config.id)
            toast({ title: t('config.configReloaded') })
        } catch (error) {
            toast({ title: t('config.reloadFailed'), description: String(error), variant: 'destructive' })
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

            toast({ title: editProxy ? t('proxy.proxyUpdated') : t('proxy.proxyAdded') })
            setShowProxyDialog(false)
            setEditProxy(null)

            // If running, reload config
            if (isRunning) {
                await handleReload()
            }
        } catch (error) {
            toast({ title: t('config.saveFailed'), description: String(error), variant: 'destructive' })
        }
    }

    const handleDeleteProxy = async (proxyName: string) => {
        try {
            await updateConfig({
                ...config,
                proxies: config.proxies.filter((p) => p.name !== proxyName),
            })
            toast({ title: t('proxy.proxyDeleted') })

            // If running, reload config
            if (isRunning) {
                await handleReload()
            }
        } catch (error) {
            toast({ title: t('config.deleteFailed'), description: String(error), variant: 'destructive' })
        }
    }

    const handleEditProxy = (proxy: ProxyType) => {
        setEditProxy(proxy)
        setShowProxyDialog(true)
    }

    const stateInfo = getStateInfo()

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{config.name}</h2>
                    <Badge variant={stateInfo.variant}>{stateInfo.label}</Badge>
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
                    </div>
                    <ScrollArea className="flex-1">
                        <VisitorList
                            visitors={config.visitors || []}
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
