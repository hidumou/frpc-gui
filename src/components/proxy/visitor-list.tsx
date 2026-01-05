import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { type Visitor } from '@/types'

interface VisitorListProps {
    visitors: Visitor[]
    onEdit?: (visitor: Visitor) => void
    onDelete?: (visitorName: string) => void
}

export function VisitorList({ visitors, onEdit, onDelete }: VisitorListProps) {
    const { t } = useTranslation()

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'stcp':
                return 'bg-orange-500'
            case 'xtcp':
                return 'bg-yellow-500'
            case 'sudp':
                return 'bg-amber-500'
            default:
                return 'bg-gray-500'
        }
    }

    if (visitors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <p className="text-sm">{t('visitor.empty')}</p>
                <p className="text-xs mt-1">{t('visitor.emptyDesc')}</p>
            </div>
        )
    }

    return (
        <div className="divide-y">
            {visitors.map((visitor) => (
                <div
                    key={visitor.name}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                    {/* Type indicator */}
                    <div className={`w-1 h-16 rounded-full ${getTypeColor(visitor.type)}`} />

                    {/* Visitor info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{visitor.name}</span>
                            <Badge variant="outline" className="text-xs">
                                {visitor.type.toUpperCase()}
                            </Badge>
                            {visitor.disabled && (
                                <Badge variant="secondary">{t('common.disabled')}</Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <div>
                                <span className="font-medium">{t('visitor.serverName')}: </span>
                                <span>{visitor.serverName}</span>
                            </div>
                            <div>
                                <span className="font-medium">{t('visitor.bindAddr')}: </span>
                                <span>{visitor.bindAddr || '127.0.0.1'}:{visitor.bindPort}</span>
                            </div>
                            {visitor.secretKey && (
                                <div>
                                    <span className="font-medium">{t('visitor.secretKey')}: </span>
                                    <span>••••••••</span>
                                </div>
                            )}
                            {visitor.protocol && (
                                <div>
                                    <span className="font-medium">{t('visitor.protocol')}: </span>
                                    <span>{visitor.protocol}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {(onEdit || onDelete) && (
                        <div className="flex items-center gap-2">
                            {onEdit && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEdit(visitor)}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                            )}
                            {onDelete && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('visitor.deleteVisitor')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('visitor.deleteVisitorConfirm', { name: visitor.name })}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(visitor.name)}>
                                                {t('common.delete')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
