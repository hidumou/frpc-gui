import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreVertical, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { type Proxy, type ProxyStatusInfo, ProxyState } from '@/types'

interface ProxyListProps {
    proxies: Proxy[]
    proxyStatuses: ProxyStatusInfo[]
    onEdit: (proxy: Proxy) => void
    onDelete: (proxyName: string) => void
}

export function ProxyList({ proxies, proxyStatuses, onEdit, onDelete }: ProxyListProps) {
    const { t } = useTranslation()
    const [deleteProxy, setDeleteProxy] = useState<string | null>(null)

    const getProxyStatus = (name: string) => {
        return proxyStatuses.find((s) => s.name === name)
    }

    const getStatusBadge = (proxy: Proxy) => {
        if (proxy.disabled) {
            return <StatusBadge status="stopped" label={t('common.disabled')} />
        }

        const status = getProxyStatus(proxy.name)
        if (!status) {
            return <StatusBadge status="unknown" label={t('common.unknown')} />
        }

        switch (status.status) {
            case ProxyState.Running:
                return <StatusBadge status="running" label={t('status.running')} />
            case ProxyState.Error:
                return <StatusBadge status="error" label={t('status.error')} />
            default:
                return <StatusBadge status="unknown" label={t('common.unknown')} />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'tcp':
                return 'bg-blue-500'
            case 'udp':
                return 'bg-green-500'
            case 'http':
                return 'bg-purple-500'
            case 'https':
                return 'bg-pink-500'
            case 'stcp':
            case 'xtcp':
            case 'sudp':
                return 'bg-orange-500'
            default:
                return 'bg-gray-500'
        }
    }

    const handleDelete = () => {
        if (deleteProxy) {
            onDelete(deleteProxy)
            setDeleteProxy(null)
        }
    }

    if (proxies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <p className="text-sm">{t('proxy.empty')}</p>
                <p className="text-xs mt-1">{t('proxy.emptyDesc')}</p>
            </div>
        )
    }

    return (
        <>
            <div className="divide-y">
                {proxies.map((proxy) => {
                    const status = getProxyStatus(proxy.name)

                    return (
                        <div
                            key={proxy.name}
                            className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                        >
                            {/* Type indicator */}
                            <div className={`w-1 h-10 rounded-full ${getTypeColor(proxy.type)}`} />

                            {/* Proxy info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{proxy.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                        {proxy.type.toUpperCase()}
                                    </Badge>
                                    {getStatusBadge(proxy)}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {proxy.localIP || '127.0.0.1'}:{proxy.localPort}
                                    {proxy.remotePort && (
                                        <span className="ml-2">→ :{proxy.remotePort}</span>
                                    )}
                                    {proxy.customDomains && proxy.customDomains.length > 0 && (
                                        <span className="ml-2">→ {proxy.customDomains.join(', ')}</span>
                                    )}
                                    {proxy.subdomain && (
                                        <span className="ml-2">→ {proxy.subdomain}.*</span>
                                    )}
                                </div>
                                {status?.remoteAddr && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {t('proxy.remoteAddr')}: {status.remoteAddr}
                                    </div>
                                )}
                                {status?.error && (
                                    <div className="text-xs text-destructive mt-1">
                                        {t('common.error')}: {status.error}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(proxy)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        {t('common.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setDeleteProxy(proxy.name)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t('common.delete')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                })}
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteProxy} onOpenChange={() => setDeleteProxy(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('proxy.deleteProxy')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('proxy.confirmDeleteProxy', { name: deleteProxy })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
