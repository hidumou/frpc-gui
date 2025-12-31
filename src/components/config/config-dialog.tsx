import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConfigStore } from '@/stores/config-store'
import { useToast } from '@/components/ui/use-toast'
import { Protocols, AuthMethods, LogLevels, type ClientConfig, type ClientCommon } from '@/types'
import { generateId } from '@/lib/utils'

interface ConfigDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    config?: ClientConfig | null
}

const defaultCommon: ClientCommon = {
    serverAddr: '',
    serverPort: 7000,
    protocol: 'tcp',
    tcpMux: true,
    log: {
        level: 'info',
        maxDays: 7,
    },
}

export function ConfigDialog({ open, onOpenChange, config }: ConfigDialogProps) {
    const { t } = useTranslation()
    const { toast } = useToast()
    const { addConfig, updateConfig } = useConfigStore()

    const [name, setName] = useState('')
    const [common, setCommon] = useState<ClientCommon>(defaultCommon)
    const [manualStart, setManualStart] = useState(false)
    const [authMethod, setAuthMethod] = useState<string>('none')
    const [token, setToken] = useState('')

    useEffect(() => {
        if (config) {
            setName(config.name)
            setCommon(config.common)
            setManualStart(config.manualStart || false)
            setAuthMethod(config.common.auth?.method || 'none')
            setToken(config.common.auth?.token || '')
        } else {
            setName('')
            setCommon(defaultCommon)
            setManualStart(false)
            setAuthMethod('none')
            setToken('')
        }
    }, [config, open])

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: t('config.pleaseEnterName'), variant: 'destructive' })
            return
        }
        if (!common.serverAddr.trim()) {
            toast({ title: t('config.pleaseEnterServerAddr'), variant: 'destructive' })
            return
        }

        try {
            const configData: ClientConfig = {
                id: config?.id || generateId(),
                name: name.trim(),
                common: {
                    ...common,
                    auth: authMethod && authMethod !== 'none'
                        ? {
                            method: authMethod as 'token' | 'oidc',
                            token: authMethod === 'token' ? token : undefined,
                        }
                        : undefined,
                },
                proxies: config?.proxies || [],
                manualStart,
            }

            if (config) {
                await updateConfig(configData)
                toast({ title: t('config.configUpdated') })
            } else {
                await addConfig(configData)
                toast({ title: t('config.configAdded') })
            }

            onOpenChange(false)
        } catch (error) {
            toast({ title: t('config.saveFailed'), description: String(error), variant: 'destructive' })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{config ? t('config.editConfig') : t('config.newConfig')}</DialogTitle>
                    <DialogDescription>
                        {t('settings.frpcSettingsDesc')}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basic" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">{t('settings.general')}</TabsTrigger>
                        <TabsTrigger value="auth">{t('auth.title')}</TabsTrigger>
                        <TabsTrigger value="advanced">{t('advanced.title')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="name">{t('config.configName')}</Label>
                                <Input
                                    id="name"
                                    placeholder={t('config.configNamePlaceholder')}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="serverAddr">{t('server.serverAddr')}</Label>
                                <Input
                                    id="serverAddr"
                                    placeholder={t('server.serverAddrPlaceholder')}
                                    value={common.serverAddr}
                                    onChange={(e) => setCommon({ ...common, serverAddr: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="serverPort">{t('server.serverPort')}</Label>
                                <Input
                                    id="serverPort"
                                    type="number"
                                    value={common.serverPort}
                                    onChange={(e) => setCommon({ ...common, serverPort: parseInt(e.target.value) || 7000 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('server.protocol')}</Label>
                                <Select
                                    value={common.protocol || 'tcp'}
                                    onValueChange={(value) => setCommon({ ...common, protocol: value as typeof common.protocol })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Protocols.map((p) => (
                                            <SelectItem key={p} value={p}>
                                                {p.toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('server.user')}</Label>
                                <Input
                                    placeholder={t('common.optional')}
                                    value={common.user || ''}
                                    onChange={(e) => setCommon({ ...common, user: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>{t('config.manualStart')}</Label>
                                <p className="text-sm text-muted-foreground">{t('config.manualStartDesc')}</p>
                            </div>
                            <Switch checked={manualStart} onCheckedChange={setManualStart} />
                        </div>
                    </TabsContent>

                    <TabsContent value="auth" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('auth.method')}</Label>
                            <Select value={authMethod} onValueChange={setAuthMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('auth.noAuth')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('auth.noAuth')}</SelectItem>
                                    {AuthMethods.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {m.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {authMethod === 'token' && (
                            <div className="space-y-2">
                                <Label htmlFor="token">{t('auth.token')}</Label>
                                <Input
                                    id="token"
                                    type="password"
                                    placeholder={t('auth.tokenPlaceholder')}
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between col-span-2">
                                <div>
                                    <Label>{t('advanced.tcpMux')}</Label>
                                    <p className="text-sm text-muted-foreground">{t('advanced.tcpMuxDesc')}</p>
                                </div>
                                <Switch
                                    checked={common.tcpMux !== false}
                                    onCheckedChange={(checked) => setCommon({ ...common, tcpMux: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between col-span-2">
                                <div>
                                    <Label>{t('advanced.tlsEnable')}</Label>
                                    <p className="text-sm text-muted-foreground">{t('advanced.tlsEnableDesc')}</p>
                                </div>
                                <Switch
                                    checked={common.tls?.enable || false}
                                    onCheckedChange={(checked) =>
                                        setCommon({ ...common, tls: { ...common.tls, enable: checked } })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('advanced.logLevel')}</Label>
                                <Select
                                    value={common.log?.level || 'info'}
                                    onValueChange={(value) =>
                                        setCommon({ ...common, log: { ...common.log, level: value as 'trace' | 'debug' | 'info' | 'warn' | 'error' } })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LogLevels.map((l) => (
                                            <SelectItem key={l} value={l}>
                                                {l.toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('advanced.heartbeatInterval')}</Label>
                                <Input
                                    type="number"
                                    value={common.heartbeatInterval || 30}
                                    onChange={(e) =>
                                        setCommon({ ...common, heartbeatInterval: parseInt(e.target.value) || 30 })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('advanced.dnsServer')}</Label>
                                <Input
                                    placeholder={t('common.optional')}
                                    value={common.dnsServer || ''}
                                    onChange={(e) => setCommon({ ...common, dnsServer: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('advanced.natHoleStunServer')}</Label>
                                <Input
                                    placeholder={t('common.optional')}
                                    value={common.natHoleStunServer || ''}
                                    onChange={(e) => setCommon({ ...common, natHoleStunServer: e.target.value })}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSave}>{t('common.save')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
