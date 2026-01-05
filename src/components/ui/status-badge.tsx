import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusType = 'running' | 'starting' | 'stopping' | 'stopped' | 'error' | 'unknown'

interface StatusBadgeProps {
    status: StatusType
    label: string
    className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
    const getStatusStyle = () => {
        switch (status) {
            case 'running':
                return {
                    variant: 'default' as const,
                    className: 'bg-green-500 hover:bg-green-600 text-white border-transparent'
                }
            case 'starting':
                return {
                    variant: 'secondary' as const,
                    className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent'
                }
            case 'stopping':
                return {
                    variant: 'secondary' as const,
                    className: 'bg-orange-500 hover:bg-orange-600 text-white border-transparent'
                }
            case 'stopped':
                return {
                    variant: 'secondary' as const,
                    className: ''
                }
            case 'error':
                return {
                    variant: 'destructive' as const,
                    className: ''
                }
            case 'unknown':
            default:
                return {
                    variant: 'secondary' as const,
                    className: ''
                }
        }
    }

    const styleInfo = getStatusStyle()

    return (
        <Badge
            variant={styleInfo.variant}
            className={cn(styleInfo.className, className)}
        >
            {label}
        </Badge>
    )
}
