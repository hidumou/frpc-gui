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
import { useToast } from '@/components/ui/use-toast'
import { ProxyTypes, type Proxy, type ProxyType, type PluginType } from '@/types'

interface ProxyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    proxy?: Proxy | null
    onSave: (proxy: Proxy) => void
}

const defaultProxy: Proxy = {
    name: '',
    type: 'tcp',
    localIP: '127.0.0.1',
    localPort: 80,
}

export function ProxyDialog({ open, onOpenChange, proxy, onSave }: ProxyDialogProps) {
    const { t } = useTranslation()
    const { toast } = useToast()
    const [formData, setFormData] = useState<Proxy>(defaultProxy)

    useEffect(() => {
        if (proxy) {
            setFormData(proxy)
        } else {
            setFormData(defaultProxy)
        }
    }, [proxy, open])

    const handleSave = () => {
        if (!formData.name.trim()) {
            toast({ title: t('proxy.pleaseEnterProxyName'), variant: 'destructive' })
            return
        }

        // Validate based on type
        if (['tcp', 'udp'].includes(formData.type) && !formData.remotePort) {
            toast({ title: t('proxy.pleaseEnterRemotePort'), variant: 'destructive' })
            return
        }

        if (['http', 'https'].includes(formData.type)) {
            if (!formData.customDomains?.length && !formData.subdomain) {
                toast({ title: t('proxy.pleaseEnterDomain'), variant: 'destructive' })
                return
            }
        }

        onSave(formData)
    }

    const updateFormData = (updates: Partial<Proxy>) => {
        setFormData((prev) => ({ ...prev, ...updates }))
    }

    const isP2PType = ['stcp', 'xtcp', 'sudp'].includes(formData.type)
    const isHttpType = ['http', 'https', 'tcpmux'].includes(formData.type)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{proxy ? t('proxy.editProxy') : t('proxy.addProxy')}</DialogTitle>
                    <DialogDescription>
                        {t('proxy.manageProxyRules')}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basic" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">{t('settings.general')}</TabsTrigger>
                        <TabsTrigger value="advanced">{t('advanced.title')}</TabsTrigger>
                        <TabsTrigger value="plugin">{t('proxy.plugin')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="name">{t('proxy.proxyName')}</Label>
                                <Input
                                    id="name"
                                    placeholder={t('proxy.proxyNamePlaceholder')}
                                    value={formData.name}
                                    onChange={(e) => updateFormData({ name: e.target.value })}
                                    disabled={!!proxy}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('proxy.proxyType')}</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => updateFormData({ type: value as ProxyType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ProxyTypes.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t.toUpperCase()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="localIP">{t('proxy.localIP')}</Label>
                                <Input
                                    id="localIP"
                                    placeholder="127.0.0.1"
                                    value={formData.localIP || ''}
                                    onChange={(e) => updateFormData({ localIP: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="localPort">{t('proxy.localPort')}</Label>
                                <Input
                                    id="localPort"
                                    type="number"
                                    placeholder="80"
                                    value={formData.localPort || ''}
                                    onChange={(e) => updateFormData({ localPort: parseInt(e.target.value) || undefined })}
                                />
                            </div>

                            {!isHttpType && !isP2PType && (
                                <div className="space-y-2">
                                    <Label htmlFor="remotePort">{t('proxy.remotePort')}</Label>
                                    <Input
                                        id="remotePort"
                                        type="number"
                                        placeholder="8080"
                                        value={formData.remotePort || ''}
                                        onChange={(e) => updateFormData({ remotePort: parseInt(e.target.value) || undefined })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* HTTP/HTTPS specific */}
                        {isHttpType && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('proxy.customDomains')}</Label>
                                    <Input
                                        placeholder={t('proxy.customDomainsPlaceholder')}
                                        value={formData.customDomains?.join(', ') || ''}
                                        onChange={(e) =>
                                            updateFormData({
                                                customDomains: e.target.value
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean),
                                            })
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">{t('proxy.customDomainsDesc')}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('proxy.subdomain')}</Label>
                                    <Input
                                        placeholder={t('proxy.subdomainPlaceholder')}
                                        value={formData.subdomain || ''}
                                        onChange={(e) => updateFormData({ subdomain: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('proxy.subdomainDesc')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* P2P specific */}
                        {isP2PType && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('proxy.secretKey')}</Label>
                                    <Input
                                        type="password"
                                        placeholder={t('proxy.secretKeyPlaceholder')}
                                        value={formData.secretKey || ''}
                                        onChange={(e) => updateFormData({ secretKey: e.target.value })}
                                    />
                                </div>

                                {formData.role === 'visitor' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>{t('proxy.serverUser')}</Label>
                                            <Input
                                                placeholder={t('proxy.serverUserPlaceholder')}
                                                value={formData.serverUser || ''}
                                                onChange={(e) => updateFormData({ serverUser: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('proxy.serverName')}</Label>
                                            <Input
                                                placeholder={t('proxy.serverNamePlaceholder')}
                                                value={formData.serverName || ''}
                                                onChange={(e) => updateFormData({ serverName: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <div>
                                <Label>{t('proxy.disableProxy')}</Label>
                                <p className="text-sm text-muted-foreground">{t('proxy.disableProxyDesc')}</p>
                            </div>
                            <Switch
                                checked={formData.disabled || false}
                                onCheckedChange={(checked) => updateFormData({ disabled: checked })}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between col-span-2">
                                <div>
                                    <Label>{t('proxy.encryption')}</Label>
                                    <p className="text-sm text-muted-foreground">{t('proxy.encryptionDesc')}</p>
                                </div>
                                <Switch
                                    checked={formData.transport?.useEncryption || false}
                                    onCheckedChange={(checked) =>
                                        updateFormData({
                                            transport: { ...formData.transport, useEncryption: checked },
                                        })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between col-span-2">
                                <div>
                                    <Label>{t('proxy.compression')}</Label>
                                    <p className="text-sm text-muted-foreground">{t('proxy.compressionDesc')}</p>
                                </div>
                                <Switch
                                    checked={formData.transport?.useCompression || false}
                                    onCheckedChange={(checked) =>
                                        updateFormData({
                                            transport: { ...formData.transport, useCompression: checked },
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('proxy.bandwidthLimit')}</Label>
                                <Input
                                    placeholder="1MB"
                                    value={formData.transport?.bandwidthLimit || ''}
                                    onChange={(e) =>
                                        updateFormData({
                                            transport: { ...formData.transport, bandwidthLimit: e.target.value },
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('proxy.loadBalanceGroup')}</Label>
                                <Input
                                    placeholder={t('common.optional')}
                                    value={formData.loadBalancer?.group || ''}
                                    onChange={(e) =>
                                        updateFormData({
                                            loadBalancer: { ...formData.loadBalancer, group: e.target.value },
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* HTTP specific advanced options */}
                        {isHttpType && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('proxy.httpUser')}</Label>
                                        <Input
                                            placeholder={t('proxy.httpUserPlaceholder')}
                                            value={formData.httpUser || ''}
                                            onChange={(e) => updateFormData({ httpUser: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('proxy.httpPassword')}</Label>
                                        <Input
                                            type="password"
                                            placeholder={t('proxy.httpPasswordPlaceholder')}
                                            value={formData.httpPwd || ''}
                                            onChange={(e) => updateFormData({ httpPwd: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('proxy.hostHeaderRewrite')}</Label>
                                    <Input
                                        placeholder="example.com"
                                        value={formData.hostHeaderRewrite || ''}
                                        onChange={(e) => updateFormData({ hostHeaderRewrite: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('proxy.locations')}</Label>
                                    <Input
                                        placeholder={t('proxy.locationsPlaceholder')}
                                        value={formData.locations?.join(', ') || ''}
                                        onChange={(e) =>
                                            updateFormData({
                                                locations: e.target.value
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        )}

                        {/* Health Check */}
                        <div className="space-y-4">
                            <Label className="text-base">{t('proxy.healthCheck')}</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('proxy.healthCheckType')}</Label>
                                    <Select
                                        value={formData.healthCheck?.type || ''}
                                        onValueChange={(value) =>
                                            updateFormData({
                                                healthCheck: { ...formData.healthCheck, type: value as 'tcp' | 'http' | '' },
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('proxy.healthCheckNone')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">{t('proxy.healthCheckNone')}</SelectItem>
                                            <SelectItem value="tcp">TCP</SelectItem>
                                            <SelectItem value="http">HTTP</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.healthCheck?.type === 'http' && (
                                    <div className="space-y-2">
                                        <Label>{t('proxy.healthCheckUrl')}</Label>
                                        <Input
                                            placeholder="/health"
                                            value={formData.healthCheck?.url || ''}
                                            onChange={(e) =>
                                                updateFormData({
                                                    healthCheck: { ...formData.healthCheck, url: e.target.value },
                                                })
                                            }
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>{t('proxy.healthCheckInterval')}</Label>
                                    <Input
                                        type="number"
                                        value={formData.healthCheck?.intervalSeconds || 10}
                                        onChange={(e) =>
                                            updateFormData({
                                                healthCheck: {
                                                    ...formData.healthCheck,
                                                    intervalSeconds: parseInt(e.target.value) || 10,
                                                },
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('proxy.healthCheckTimeout')}</Label>
                                    <Input
                                        type="number"
                                        value={formData.healthCheck?.timeoutSeconds || 3}
                                        onChange={(e) =>
                                            updateFormData({
                                                healthCheck: {
                                                    ...formData.healthCheck,
                                                    timeoutSeconds: parseInt(e.target.value) || 3,
                                                },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="plugin" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('proxy.pluginType')}</Label>
                            <Select
                                value={formData.plugin?.type || ''}
                                onValueChange={(value) =>
                                    updateFormData({
                                        plugin: { type: value as PluginType | '' },
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('proxy.pluginNone')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">{t('proxy.pluginNone')}</SelectItem>
                                    <SelectItem value="http_proxy">{t('proxy.pluginHttpProxy')}</SelectItem>
                                    <SelectItem value="socks5">{t('proxy.pluginSocks5')}</SelectItem>
                                    <SelectItem value="static_file">{t('proxy.pluginStaticFile')}</SelectItem>
                                    <SelectItem value="https2http">{t('proxy.pluginHttps2Http')}</SelectItem>
                                    <SelectItem value="https2https">{t('proxy.pluginHttps2Https')}</SelectItem>
                                    <SelectItem value="http2https">{t('proxy.pluginHttp2Https')}</SelectItem>
                                    <SelectItem value="unix_domain_socket">{t('proxy.pluginUnixSocket')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.plugin?.type === 'static_file' && (
                            <div className="space-y-2">
                                <Label>{t('proxy.localPath')}</Label>
                                <Input
                                    placeholder={t('proxy.localPathPlaceholder')}
                                    value={formData.plugin?.localPath || ''}
                                    onChange={(e) =>
                                        updateFormData({
                                            plugin: { ...formData.plugin, localPath: e.target.value },
                                        })
                                    }
                                />
                            </div>
                        )}

                        {(formData.plugin?.type === 'http_proxy' || formData.plugin?.type === 'socks5') && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('server.user')}</Label>
                                    <Input
                                        value={formData.plugin?.user || ''}
                                        onChange={(e) =>
                                            updateFormData({
                                                plugin: { ...formData.plugin, user: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('proxy.httpPassword')}</Label>
                                    <Input
                                        type="password"
                                        value={formData.plugin?.passwd || ''}
                                        onChange={(e) =>
                                            updateFormData({
                                                plugin: { ...formData.plugin, passwd: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        )}

                        {formData.plugin?.type === 'unix_domain_socket' && (
                            <div className="space-y-2">
                                <Label>{t('proxy.unixSocketPath')}</Label>
                                <Input
                                    placeholder={t('proxy.unixSocketPathPlaceholder')}
                                    value={formData.plugin?.unixPath || ''}
                                    onChange={(e) =>
                                        updateFormData({
                                            plugin: { ...formData.plugin, unixPath: e.target.value },
                                        })
                                    }
                                />
                            </div>
                        )}
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
