import { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useConfigStore } from '@/stores/config-store'
import { toast } from 'sonner'
import { FileUp, Clipboard } from 'lucide-react'

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
    const { t } = useTranslation()
    const { importConfig, loadConfigs } = useConfigStore()

    const [filePath, setFilePath] = useState('')
    const [clipboardContent, setClipboardContent] = useState('')
    const [isImporting, setIsImporting] = useState(false)

    const handleSelectFile = async () => {
        const path = await window.electronAPI.system.selectFile({
            title: t('import.selectFile'),
            filters: [
                { name: 'TOML', extensions: ['toml'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        })
        if (path) {
            setFilePath(path)
        }
    }

    const handleImportFromFile = async () => {
        if (!filePath) {
            toast.error(t('import.pleaseSelectFile'))
            return
        }

        setIsImporting(true)
        try {
            await importConfig(filePath)
            toast.success(t('config.importSuccess'))
            onOpenChange(false)
            setFilePath('')
        } catch (error) {
            toast.error(t('config.importFailed'), {
                description: String(error)
            })
        } finally {
            setIsImporting(false)
        }
    }

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText()
            setClipboardContent(text)
        } catch (error) {
            toast.error(t('import.cannotReadClipboard'))
        }
    }

    const handleImportFromClipboard = async () => {
        if (!clipboardContent) {
            toast.error(t('import.pleaseEnterContent'))
            return
        }

        setIsImporting(true)
        try {
            await window.electronAPI.config.importText(clipboardContent)
            await loadConfigs()
            toast.success(t('config.importSuccess'))
            onOpenChange(false)
            setClipboardContent('')
        } catch (error) {
            toast.error(t('config.importFailed'), {
                description: String(error)
            })
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('import.title')}</DialogTitle>
                    <DialogDescription>{t('import.description')}</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="file" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="file">
                            <FileUp className="h-4 w-4 mr-2" />
                            {t('import.fromFile')}
                        </TabsTrigger>
                        <TabsTrigger value="clipboard">
                            <Clipboard className="h-4 w-4 mr-2" />
                            {t('import.fromClipboard')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('import.selectFile')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder={t('import.selectFilePlaceholder')}
                                    value={filePath}
                                    readOnly
                                />
                                <Button variant="outline" onClick={handleSelectFile}>
                                    {t('common.browse')}
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('import.fileSupport')}
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button onClick={handleImportFromFile} disabled={isImporting || !filePath}>
                                {isImporting ? t('common.importing') : t('common.import')}
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="clipboard" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t('import.clipboardContent')}</Label>
                                <Button variant="ghost" size="sm" onClick={handlePasteFromClipboard}>
                                    <Clipboard className="h-4 w-4 mr-2" />
                                    {t('common.paste')}
                                </Button>
                            </div>
                            <Textarea
                                placeholder={t('import.clipboardPlaceholder')}
                                className="min-h-[200px] font-mono text-sm"
                                value={clipboardContent}
                                onChange={(e) => setClipboardContent(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={handleImportFromClipboard}
                                disabled={isImporting || !clipboardContent}
                            >
                                {isImporting ? t('common.importing') : t('common.import')}
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
