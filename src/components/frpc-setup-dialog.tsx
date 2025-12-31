import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, FolderOpen, Loader2 } from 'lucide-react'

interface FrpcSetupDialogProps {
    open: boolean
    onSetupComplete: () => void
}

export function FrpcSetupDialog({ open, onSetupComplete }: FrpcSetupDialogProps) {
    const { t } = useTranslation()
    const [frpcPath, setFrpcPath] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [verifyResult, setVerifyResult] = useState<{
        valid: boolean
        version?: string
        error?: string
    } | null>(null)

    // Auto-verify when path changes
    useEffect(() => {
        if (frpcPath) {
            const timer = setTimeout(() => {
                handleVerify()
            }, 500)
            return () => clearTimeout(timer)
        } else {
            setVerifyResult(null)
        }
    }, [frpcPath])

    const handleSelectFile = async () => {
        const platform = await window.electronAPI.system.getPlatform()
        
        // Build filters based on platform
        const filters: { name: string; extensions: string[] }[] = []
        if (platform === 'win32') {
            filters.push({ name: t('frpcSetup.executable'), extensions: ['exe'] })
        }
        // For macOS and Linux, we don't add filters because executables don't have extensions
        // This allows selecting any file
        
        const filePath = await window.electronAPI.system.selectFile({
            title: t('frpcSetup.selectFrpc'),
            filters: filters.length > 0 ? filters : undefined,
        })
        
        if (filePath) {
            setFrpcPath(filePath)
        }
    }

    const handleVerify = useCallback(async () => {
        if (!frpcPath) return
        
        setVerifying(true)
        try {
            const result = await window.electronAPI.frpc.verifyPath(frpcPath)
            setVerifyResult(result)
        } catch {
            setVerifyResult({ valid: false, error: 'Verification failed' })
        } finally {
            setVerifying(false)
        }
    }, [frpcPath])

    const handleConfirm = async () => {
        if (!verifyResult?.valid) return
        
        const success = await window.electronAPI.frpc.setPath(frpcPath)
        if (success) {
            onSetupComplete()
        }
    }

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent 
                className="sm:max-w-md" 
                hideCloseButton
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        {t('frpcSetup.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('frpcSetup.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('frpcSetup.frpcPath')}</Label>
                        <div className="flex gap-2">
                            <Input
                                value={frpcPath}
                                onChange={(e) => setFrpcPath(e.target.value)}
                                placeholder={t('frpcSetup.frpcPathPlaceholder')}
                            />
                            <Button variant="outline" onClick={handleSelectFile}>
                                <FolderOpen className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('frpcSetup.frpcPathDesc')}
                        </p>
                    </div>

                    {/* Verification status */}
                    {verifying && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('frpcSetup.verifying')}
                        </div>
                    )}

                    {verifyResult && !verifying && (
                        <div className={`flex items-center gap-2 text-sm ${
                            verifyResult.valid ? 'text-green-600' : 'text-red-500'
                        }`}>
                            {verifyResult.valid ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    {t('frpcSetup.verified', { version: verifyResult.version })}
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-4 w-4" />
                                    {t('frpcSetup.verifyFailed')}: {verifyResult.error}
                                </>
                            )}
                        </div>
                    )}

                    {/* Download hint */}
                    <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                        <p className="font-medium">{t('frpcSetup.downloadHint')}</p>
                        <p className="text-muted-foreground mt-1">
                            {t('frpcSetup.downloadHintDesc')}
                        </p>
                        <a
                            href="https://github.com/fatedier/frp/releases"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline mt-2 inline-block"
                        >
                            https://github.com/fatedier/frp/releases
                        </a>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button
                        onClick={handleConfirm}
                        disabled={!verifyResult?.valid || verifying}
                    >
                        {t('frpcSetup.confirm')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
