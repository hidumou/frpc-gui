import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { type Visitor } from '@/types'

interface VisitorListProps {
    visitors: Visitor[]
}

export function VisitorList({ visitors }: VisitorListProps) {
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
                    <div className={`w-1 h-10 rounded-full ${getTypeColor(visitor.type)}`} />

                    {/* Visitor info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{visitor.name}</span>
                            <Badge variant="outline" className="text-xs">
                                {visitor.type.toUpperCase()}
                            </Badge>
                            {visitor.disabled && (
                                <Badge variant="secondary">{t('common.disabled')}</Badge>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                            <span>{t('visitor.serverName')}: {visitor.serverName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                            <span>{t('visitor.bindAddr')}: {visitor.bindAddr || '127.0.0.1'}:{visitor.bindPort}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
