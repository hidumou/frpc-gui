import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { toast } from 'sonner'
import { ProxyTypes, type Proxy, type PluginType } from '@/types'

interface ProxyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    proxy?: Proxy | null
    onSave: (proxy: Proxy) => void
}

// Health check type: 'tcp' | 'http' | 'none' (use 'none' instead of empty string)
const HealthCheckTypes = ['none', 'tcp', 'http'] as const
type HealthCheckType = (typeof HealthCheckTypes)[number]

// Plugin type: use 'none' instead of empty string
const PluginTypeOptions = ['none', 'http_proxy', 'socks5', 'static_file', 'https2http', 'https2https', 'http2https', 'unix_domain_socket'] as const
type PluginTypeOption = (typeof PluginTypeOptions)[number]

// Form schema
const proxyFormSchema = z.object({
    name: z.string().min(1, 'proxy.pleaseEnterProxyName'),
    type: z.enum(ProxyTypes),
    localIP: z.string().optional(),
    localPort: z.coerce.number().optional(),
    remotePort: z.coerce.number().optional(),
    customDomains: z.string().optional(),
    subdomain: z.string().optional(),
    secretKey: z.string().optional(),
    serverUser: z.string().optional(),
    serverName: z.string().optional(),
    role: z.enum(['server', 'visitor', '']).optional(),
    disabled: z.boolean().optional(),
    // Transport
    useEncryption: z.boolean().optional(),
    useCompression: z.boolean().optional(),
    bandwidthLimit: z.string().optional(),
    // Load balancer
    loadBalancerGroup: z.string().optional(),
    // HTTP specific
    httpUser: z.string().optional(),
    httpPwd: z.string().optional(),
    hostHeaderRewrite: z.string().optional(),
    locations: z.string().optional(),
    // Health check
    healthCheckType: z.enum(HealthCheckTypes).optional(),
    healthCheckUrl: z.string().optional(),
    healthCheckInterval: z.coerce.number().optional(),
    healthCheckTimeout: z.coerce.number().optional(),
    // Plugin
    pluginType: z.enum(PluginTypeOptions).optional(),
    pluginLocalPath: z.string().optional(),
    pluginUser: z.string().optional(),
    pluginPasswd: z.string().optional(),
    pluginUnixPath: z.string().optional(),
})

type ProxyFormData = z.infer<typeof proxyFormSchema>

const defaultValues: ProxyFormData = {
    name: '',
    type: 'tcp',
    localIP: '127.0.0.1',
    localPort: 80,
    disabled: false,
    useEncryption: false,
    useCompression: false,
    healthCheckType: 'none',
    healthCheckInterval: 10,
    healthCheckTimeout: 3,
    pluginType: 'none',
}

// Convert Proxy to form data
function proxyToFormData(proxy: Proxy): ProxyFormData {
    return {
        name: proxy.name,
        type: proxy.type,
        localIP: proxy.localIP || '127.0.0.1',
        localPort: typeof proxy.localPort === 'string' ? parseInt(proxy.localPort) : proxy.localPort,
        remotePort: typeof proxy.remotePort === 'string' ? parseInt(proxy.remotePort) : proxy.remotePort,
        customDomains: proxy.customDomains?.join(', ') || '',
        subdomain: proxy.subdomain || '',
        secretKey: proxy.secretKey || '',
        serverUser: proxy.serverUser || '',
        serverName: proxy.serverName || '',
        role: proxy.role || '',
        disabled: proxy.disabled || false,
        useEncryption: proxy.transport?.useEncryption || false,
        useCompression: proxy.transport?.useCompression || false,
        bandwidthLimit: proxy.transport?.bandwidthLimit || '',
        loadBalancerGroup: proxy.loadBalancer?.group || '',
        httpUser: proxy.httpUser || '',
        httpPwd: proxy.httpPwd || '',
        hostHeaderRewrite: proxy.hostHeaderRewrite || '',
        locations: proxy.locations?.join(', ') || '',
        healthCheckType: (proxy.healthCheck?.type || 'none') as HealthCheckType,
        healthCheckUrl: proxy.healthCheck?.url || '',
        healthCheckInterval: proxy.healthCheck?.intervalSeconds || 10,
        healthCheckTimeout: proxy.healthCheck?.timeoutSeconds || 3,
        pluginType: (proxy.plugin?.type || 'none') as PluginTypeOption,
        pluginLocalPath: proxy.plugin?.localPath || '',
        pluginUser: proxy.plugin?.user || '',
        pluginPasswd: proxy.plugin?.passwd || '',
        pluginUnixPath: proxy.plugin?.unixPath || '',
    }
}

// Convert form data to Proxy
function formDataToProxy(data: ProxyFormData): Proxy {
    const proxy: Proxy = {
        name: data.name,
        type: data.type,
        localIP: data.localIP,
        localPort: data.localPort,
        disabled: data.disabled,
    }

    if (data.remotePort) proxy.remotePort = data.remotePort
    if (data.customDomains) {
        proxy.customDomains = data.customDomains.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    if (data.subdomain) proxy.subdomain = data.subdomain
    if (data.secretKey) proxy.secretKey = data.secretKey
    if (data.serverUser) proxy.serverUser = data.serverUser
    if (data.serverName) proxy.serverName = data.serverName
    if (data.role) proxy.role = data.role as 'server' | 'visitor' | ''

    // Transport
    if (data.useEncryption || data.useCompression || data.bandwidthLimit) {
        proxy.transport = {
            useEncryption: data.useEncryption,
            useCompression: data.useCompression,
            bandwidthLimit: data.bandwidthLimit,
        }
    }

    // Load balancer
    if (data.loadBalancerGroup) {
        proxy.loadBalancer = { group: data.loadBalancerGroup }
    }

    // HTTP specific
    if (data.httpUser) proxy.httpUser = data.httpUser
    if (data.httpPwd) proxy.httpPwd = data.httpPwd
    if (data.hostHeaderRewrite) proxy.hostHeaderRewrite = data.hostHeaderRewrite
    if (data.locations) {
        proxy.locations = data.locations.split(',').map((s: string) => s.trim()).filter(Boolean)
    }

    // Health check
    if (data.healthCheckType && data.healthCheckType !== 'none') {
        proxy.healthCheck = {
            type: data.healthCheckType,
            intervalSeconds: data.healthCheckInterval,
            timeoutSeconds: data.healthCheckTimeout,
        }
        if (data.healthCheckType === 'http' && data.healthCheckUrl) {
            proxy.healthCheck.url = data.healthCheckUrl
        }
    }

    // Plugin
    if (data.pluginType && data.pluginType !== 'none') {
        proxy.plugin = {
            type: data.pluginType as PluginType,
        }
        if (data.pluginLocalPath) proxy.plugin.localPath = data.pluginLocalPath
        if (data.pluginUser) proxy.plugin.user = data.pluginUser
        if (data.pluginPasswd) proxy.plugin.passwd = data.pluginPasswd
        if (data.pluginUnixPath) proxy.plugin.unixPath = data.pluginUnixPath
    }

    return proxy
}

export function ProxyDialog({ open, onOpenChange, proxy, onSave }: ProxyDialogProps) {
    const { t } = useTranslation()

    const form = useForm<ProxyFormData>({
        resolver: zodResolver(proxyFormSchema),
        defaultValues,
    })

    const { control, handleSubmit, watch, reset, formState: { errors } } = form

    useEffect(() => {
        if (open) {
            if (proxy) {
                reset(proxyToFormData(proxy))
            } else {
                reset(defaultValues)
            }
        }
    }, [proxy, open, reset])

    const watchType = watch('type')
    const watchRole = watch('role')
    const watchHealthCheckType = watch('healthCheckType')
    const watchPluginType = watch('pluginType')

    const onSubmit = (data: ProxyFormData) => {
        // Validate based on type
        if (['tcp', 'udp'].includes(data.type) && !data.remotePort) {
            toast.error(t('proxy.pleaseEnterRemotePort'))
            return
        }

        if (['http', 'https'].includes(data.type)) {
            const hasCustomDomains = data.customDomains && data.customDomains.split(',').filter(Boolean).length > 0
            if (!hasCustomDomains && !data.subdomain) {
                toast.error(t('proxy.pleaseEnterDomain'))
                return
            }
        }

        onSave(formDataToProxy(data))
    }

    const handleFormSubmit = handleSubmit(onSubmit, (fieldErrors) => {
        const firstError = Object.values(fieldErrors)[0] as { message?: string } | undefined
        if (firstError?.message) {
            toast.error(t(firstError.message))
        }
    })

    const isP2PType = ['stcp', 'xtcp', 'sudp'].includes(watchType)
    const isHttpType = ['http', 'https', 'tcpmux'].includes(watchType)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{proxy ? t('proxy.editProxy') : t('proxy.addProxy')}</DialogTitle>
                    <DialogDescription>
                        {t('proxy.manageProxyRules')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleFormSubmit}>
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
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                id="name"
                                                placeholder={t('proxy.proxyNamePlaceholder')}
                                                {...field}
                                                disabled={!!proxy}
                                            />
                                        )}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">{t(errors.name.message!)}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('proxy.proxyType')}</Label>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ProxyTypes.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {type.toUpperCase()}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="localIP">{t('proxy.localIP')}</Label>
                                    <Controller
                                        name="localIP"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                id="localIP"
                                                placeholder="127.0.0.1"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="localPort">{t('proxy.localPort')}</Label>
                                    <Controller
                                        name="localPort"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                id="localPort"
                                                type="number"
                                                placeholder="80"
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                            />
                                        )}
                                    />
                                </div>

                                {!isHttpType && !isP2PType && (
                                    <div className="space-y-2">
                                        <Label htmlFor="remotePort">{t('proxy.remotePort')}</Label>
                                        <Controller
                                            name="remotePort"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    id="remotePort"
                                                    type="number"
                                                    placeholder="8080"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                />
                                            )}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* HTTP/HTTPS specific */}
                            {isHttpType && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('proxy.customDomains')}</Label>
                                        <Controller
                                            name="customDomains"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    placeholder={t('proxy.customDomainsPlaceholder')}
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
                                        />
                                        <p className="text-xs text-muted-foreground">{t('proxy.customDomainsDesc')}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('proxy.subdomain')}</Label>
                                        <Controller
                                            name="subdomain"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    placeholder={t('proxy.subdomainPlaceholder')}
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
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
                                        <Controller
                                            name="secretKey"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    type="password"
                                                    placeholder={t('proxy.secretKeyPlaceholder')}
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
                                        />
                                    </div>

                                    {watchRole === 'visitor' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('proxy.serverUser')}</Label>
                                                <Controller
                                                    name="serverUser"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            placeholder={t('proxy.serverUserPlaceholder')}
                                                            {...field}
                                                            value={field.value || ''}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('proxy.serverName')}</Label>
                                                <Controller
                                                    name="serverName"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            placeholder={t('proxy.serverNamePlaceholder')}
                                                            {...field}
                                                            value={field.value || ''}
                                                        />
                                                    )}
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
                                <Controller
                                    name="disabled"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            checked={field.value || false}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
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
                                    <Controller
                                        name="useEncryption"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value || false}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-between col-span-2">
                                    <div>
                                        <Label>{t('proxy.compression')}</Label>
                                        <p className="text-sm text-muted-foreground">{t('proxy.compressionDesc')}</p>
                                    </div>
                                    <Controller
                                        name="useCompression"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value || false}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('proxy.bandwidthLimit')}</Label>
                                    <Controller
                                        name="bandwidthLimit"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                placeholder="1MB"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('proxy.loadBalanceGroup')}</Label>
                                    <Controller
                                        name="loadBalancerGroup"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                placeholder={t('common.optional')}
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            {/* HTTP specific advanced options */}
                            {isHttpType && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('proxy.httpUser')}</Label>
                                            <Controller
                                                name="httpUser"
                                                control={control}
                                                render={({ field }) => (
                                                    <Input
                                                        placeholder={t('proxy.httpUserPlaceholder')}
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t('proxy.httpPassword')}</Label>
                                            <Controller
                                                name="httpPwd"
                                                control={control}
                                                render={({ field }) => (
                                                    <Input
                                                        type="password"
                                                        placeholder={t('proxy.httpPasswordPlaceholder')}
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('proxy.hostHeaderRewrite')}</Label>
                                        <Controller
                                            name="hostHeaderRewrite"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    placeholder="example.com"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('proxy.locations')}</Label>
                                        <Controller
                                            name="locations"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    placeholder={t('proxy.locationsPlaceholder')}
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
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
                                        <Controller
                                            name="healthCheckType"
                                            control={control}
                                            render={({ field }) => (
                                                <Select value={field.value || 'none'} onValueChange={field.onChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('proxy.healthCheckNone')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">{t('proxy.healthCheckNone')}</SelectItem>
                                                        <SelectItem value="tcp">TCP</SelectItem>
                                                        <SelectItem value="http">HTTP</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    {watchHealthCheckType === 'http' && (
                                        <div className="space-y-2">
                                            <Label>{t('proxy.healthCheckUrl')}</Label>
                                            <Controller
                                                name="healthCheckUrl"
                                                control={control}
                                                render={({ field }) => (
                                                    <Input
                                                        placeholder="/health"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                )}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>{t('proxy.healthCheckInterval')}</Label>
                                        <Controller
                                            name="healthCheckInterval"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    value={field.value || 10}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('proxy.healthCheckTimeout')}</Label>
                                        <Controller
                                            name="healthCheckTimeout"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    value={field.value || 3}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="plugin" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>{t('proxy.pluginType')}</Label>
                                <Controller
                                    name="pluginType"
                                    control={control}
                                    render={({ field }) => (
                                        <Select value={field.value || 'none'} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('proxy.pluginNone')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t('proxy.pluginNone')}</SelectItem>
                                                <SelectItem value="http_proxy">{t('proxy.pluginHttpProxy')}</SelectItem>
                                                <SelectItem value="socks5">{t('proxy.pluginSocks5')}</SelectItem>
                                                <SelectItem value="static_file">{t('proxy.pluginStaticFile')}</SelectItem>
                                                <SelectItem value="https2http">{t('proxy.pluginHttps2Http')}</SelectItem>
                                                <SelectItem value="https2https">{t('proxy.pluginHttps2Https')}</SelectItem>
                                                <SelectItem value="http2https">{t('proxy.pluginHttp2Https')}</SelectItem>
                                                <SelectItem value="unix_domain_socket">{t('proxy.pluginUnixSocket')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {watchPluginType === 'static_file' && (
                                <div className="space-y-2">
                                    <Label>{t('proxy.localPath')}</Label>
                                    <Controller
                                        name="pluginLocalPath"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                placeholder={t('proxy.localPathPlaceholder')}
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        )}
                                    />
                                </div>
                            )}

                            {(watchPluginType === 'http_proxy' || watchPluginType === 'socks5') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('server.user')}</Label>
                                        <Controller
                                            name="pluginUser"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('proxy.httpPassword')}</Label>
                                        <Controller
                                            name="pluginPasswd"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    type="password"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {watchPluginType === 'unix_domain_socket' && (
                                <div className="space-y-2">
                                    <Label>{t('proxy.unixSocketPath')}</Label>
                                    <Controller
                                        name="pluginUnixPath"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                placeholder={t('proxy.unixSocketPathPlaceholder')}
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">{t('common.save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
