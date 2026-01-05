import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { LogLevels, Protocols, type AppConfig, type Protocol } from '@/types'
import { languages } from '@/i18n'

function SettingsPage() {
    const { t, i18n } = useTranslation()
    const [appPaths, setAppPaths] = useState({ userData: '', logs: '', temp: '' })
    const [frpcPath, setFrpcPath] = useState('')
    const [frpcVersion, setFrpcVersion] = useState<string | null>(null)
    const [verifying, setVerifying] = useState(false)
    const [verifyResult, setVerifyResult] = useState<{ valid: boolean; version?: string; error?: string } | null>(null)
    const [settings, setSettings] = useState<AppConfig>({
        lang: i18n.language,
        checkUpdate: true,
        defaults: {
            protocol: 'tcp',
            logLevel: 'info',
            logMaxDays: 7,
            tcpMux: true,
            tlsEnable: false,
            manualStart: false,
        },
    })

    useEffect(() => {
        window.electronAPI.system.getAppPath().then(setAppPaths)
        loadFrpcInfo()
    }, [])

    const loadFrpcInfo = async () => {
        try {
            const result = await window.electronAPI.frpc.check()
            if (result.available) {
                setFrpcPath(result.path || '')
                setFrpcVersion(result.version || null)
            }
        } catch (error) {
            console.error('Failed to load frpc info:', error)
        }
    }

    const handleOpenFolder = async (path: string) => {
        await window.electronAPI.system.openFolder(path)
    }

    const handleSelectFrpcPath = async () => {
        const platform = await window.electronAPI.system.getPlatform()

        // Build filters based on platform
        const filters: { name: string; extensions: string[] }[] = []
        if (platform === 'win32') {
            filters.push({ name: t('frpcSetup.executable'), extensions: ['exe'] })
        }
        // For macOS and Linux, we don't add filters because executables don't have extensions

        const filePath = await window.electronAPI.system.selectFile({
            title: t('settings.selectFrpc'),
            filters: filters.length > 0 ? filters : undefined,
        })

        if (filePath) {
            setFrpcPath(filePath)
            // Verify the selected path
            setVerifying(true)
            try {
                const result = await window.electronAPI.frpc.verifyPath(filePath)
                setVerifyResult(result)
                if (result.valid) {
                    // Save the path
                    const success = await window.electronAPI.frpc.setPath(filePath)
                    if (success) {
                        setFrpcVersion(result.version || null)
                        toast.success(t('settings.frpcPathSelected'), {
                            description: `${filePath} (v${result.version})`
                        })
                    }
                } else {
                    toast.error(t('common.error'), {
                        description: result.error
                    })
                }
            } finally {
                setVerifying(false)
            }
        }
    }

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang)
        setSettings({ ...settings, lang })
    }

    const handleSave = () => {
        toast.success(t('settings.saved'))
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold">{t('settings.title')}</h2>
                <p className="text-muted-foreground">{t('settings.description')}</p>
            </div>

            <Separator />

            {/* General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.general')}</CardTitle>
                    <CardDescription>{t('settings.generalDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t('settings.language')}</Label>
                            <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
                        </div>
                        <Select value={settings.lang} onValueChange={handleLanguageChange}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {languages.map((lang) => (
                                    <SelectItem key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t('settings.autoCheckUpdate')}</Label>
                            <p className="text-sm text-muted-foreground">{t('settings.autoCheckUpdateDesc')}</p>
                        </div>
                        <Switch
                            checked={settings.checkUpdate}
                            onCheckedChange={(checked) => setSettings({ ...settings, checkUpdate: checked })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* FRPC Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.frpcSettings')}</CardTitle>
                    <CardDescription>{t('settings.frpcSettingsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('settings.frpcPath')}</Label>
                        <div className="flex gap-2">
                            <Input
                                value={frpcPath}
                                placeholder={t('settings.frpcPathPlaceholder')}
                                readOnly
                            />
                            <Button variant="outline" onClick={handleSelectFrpcPath} disabled={verifying}>
                                {verifying ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FolderOpen className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        {frpcVersion && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                {t('frpcSetup.verified', { version: frpcVersion })}
                            </div>
                        )}
                        {verifyResult && !verifyResult.valid && (
                            <div className="flex items-center gap-2 text-sm text-red-500">
                                <AlertCircle className="h-4 w-4" />
                                {verifyResult.error}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">{t('settings.frpcPathDesc')}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Default Values */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.defaults')}</CardTitle>
                    <CardDescription>{t('settings.defaultsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('server.protocol')}</Label>
                            <Select
                                value={settings.defaults?.protocol || 'tcp'}
                                onValueChange={(value) =>
                                    setSettings({
                                        ...settings,
                                        defaults: { ...settings.defaults, protocol: value as Protocol },
                                    })
                                }
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
                            <Label>{t('advanced.logLevel')}</Label>
                            <Select
                                value={settings.defaults?.logLevel || 'info'}
                                onValueChange={(value) =>
                                    setSettings({
                                        ...settings,
                                        defaults: { ...settings.defaults, logLevel: value as 'trace' | 'debug' | 'info' | 'warn' | 'error' },
                                    })
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
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t('settings.defaultTcpMux')}</Label>
                            <p className="text-sm text-muted-foreground">{t('settings.defaultTcpMuxDesc')}</p>
                        </div>
                        <Switch
                            checked={settings.defaults?.tcpMux}
                            onCheckedChange={(checked) =>
                                setSettings({
                                    ...settings,
                                    defaults: { ...settings.defaults, tcpMux: checked },
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t('settings.defaultTls')}</Label>
                            <p className="text-sm text-muted-foreground">{t('settings.defaultTlsDesc')}</p>
                        </div>
                        <Switch
                            checked={settings.defaults?.tlsEnable}
                            onCheckedChange={(checked) =>
                                setSettings({
                                    ...settings,
                                    defaults: { ...settings.defaults, tlsEnable: checked },
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label>{t('settings.defaultManualStart')}</Label>
                            <p className="text-sm text-muted-foreground">{t('settings.defaultManualStartDesc')}</p>
                        </div>
                        <Switch
                            checked={settings.defaults?.manualStart}
                            onCheckedChange={(checked) =>
                                setSettings({
                                    ...settings,
                                    defaults: { ...settings.defaults, manualStart: checked },
                                })
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Paths */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.dataDirs')}</CardTitle>
                    <CardDescription>{t('settings.dataDirsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('settings.configDir')}</Label>
                        <div className="flex gap-2">
                            <Input value={appPaths.userData} readOnly />
                            <Button variant="outline" onClick={() => handleOpenFolder(appPaths.userData)}>
                                <FolderOpen className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('settings.logDir')}</Label>
                        <div className="flex gap-2">
                            <Input value={appPaths.logs} readOnly />
                            <Button variant="outline" onClick={() => handleOpenFolder(appPaths.logs)}>
                                <FolderOpen className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave}>{t('common.save')}</Button>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/settings')({
    component: SettingsPage,
})
