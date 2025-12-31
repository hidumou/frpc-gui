import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Play, Square, MoreVertical, FileUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useConfigStore } from '@/stores/config-store'
import { ConfigDialog } from './config-dialog'
import { ImportDialog } from './import-dialog'
import { ConfigState, type ClientConfig } from '@/types'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

export function ConfigList() {
    const { t } = useTranslation()
    const { toast } = useToast()
    const {
        configs,
        selectedConfigId,
        configStates,
        selectConfig,
        startConfig,
        stopConfig,
        deleteConfig,
    } = useConfigStore()

    const [showConfigDialog, setShowConfigDialog] = useState(false)
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [editConfig, setEditConfig] = useState<ClientConfig | null>(null)

    const getStateInfo = (id: string) => {
        const state = configStates.get(id) || ConfigState.Stopped
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

    const handleStart = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await startConfig(id)
            toast({ title: t('config.configStarted') })
        } catch (error) {
            toast({ title: t('config.startFailed'), description: String(error), variant: 'destructive' })
        }
    }

    const handleStop = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await stopConfig(id)
            toast({ title: t('config.configStopped') })
        } catch (error) {
            toast({ title: t('config.stopFailed'), description: String(error), variant: 'destructive' })
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return
        try {
            await deleteConfig(deleteId)
            toast({ title: t('config.configDeleted') })
            setDeleteId(null)
        } catch (error) {
            toast({ title: t('config.deleteFailed'), description: String(error), variant: 'destructive' })
        }
    }

    const handleEdit = (config: ClientConfig) => {
        setEditConfig(config)
        setShowConfigDialog(true)
    }

    const isRunning = (id: string) => {
        const state = configStates.get(id)
        return state === ConfigState.Started || state === ConfigState.Starting
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-sm font-semibold">{t('config.title')}</h2>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowImportDialog(true)}
                    >
                        <FileUp className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                            setEditConfig(null)
                            setShowConfigDialog(true)
                        }}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Config List */}
            <ScrollArea className="flex-1">
                {configs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <p className="text-sm">{t('config.empty')}</p>
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                                setEditConfig(null)
                                setShowConfigDialog(true)
                            }}
                        >
                            {t('config.addConfig')}
                        </Button>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {configs.map((config) => {
                            const stateInfo = getStateInfo(config.id)
                            const running = isRunning(config.id)
                            const isSelected = selectedConfigId === config.id

                            return (
                                <div
                                    key={config.id}
                                    className={cn(
                                        'flex items-center gap-2 p-3 rounded-md cursor-pointer transition-colors',
                                        isSelected ? 'bg-accent' : 'hover:bg-muted/50'
                                    )}
                                    onClick={() => selectConfig(config.id)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{config.name}</span>
                                            <Badge variant={stateInfo.variant} className="text-xs">
                                                {stateInfo.label}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {config.common.serverAddr}:{config.common.serverPort}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {running ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={(e) => handleStop(config.id, e)}
                                            >
                                                <Square className="h-3.5 w-3.5" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={(e) => handleStart(config.id, e)}
                                            >
                                                <Play className="h-3.5 w-3.5" />
                                            </Button>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(config)}>
                                                    {t('common.edit')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        // Export logic
                                                    }}
                                                >
                                                    {t('common.export')}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => setDeleteId(config.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    {t('common.delete')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* Config Dialog */}
            <ConfigDialog
                open={showConfigDialog}
                onOpenChange={setShowConfigDialog}
                config={editConfig}
            />

            {/* Import Dialog */}
            <ImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('config.confirmDelete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('config.confirmDeleteDesc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
