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
import { toast } from 'sonner'
import { type Visitor } from '@/types'

interface VisitorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    visitor?: Visitor | null
    onSave: (visitor: Visitor) => void
}

const VisitorTypes = ['stcp', 'xtcp', 'sudp'] as const

// Form schema
const visitorFormSchema = z.object({
    name: z.string().min(1, 'visitor.pleaseEnterVisitorName'),
    type: z.enum(VisitorTypes),
    serverName: z.string().min(1, 'visitor.pleaseEnterServerName'),
    secretKey: z.string().optional(),
    bindAddr: z.string().optional(),
    bindPort: z.coerce.number().optional(),
    // XTCP specific
    protocol: z.string().optional(),
    keepTunnelOpen: z.boolean().optional(),
    maxRetriesAnHour: z.coerce.number().optional(),
    minRetryInterval: z.coerce.number().optional(),
    fallbackTo: z.string().optional(),
    fallbackTimeoutMs: z.coerce.number().optional(),
    disabled: z.boolean().optional(),
})

type VisitorFormData = z.infer<typeof visitorFormSchema>

const defaultValues: VisitorFormData = {
    name: '',
    type: 'stcp',
    serverName: '',
    secretKey: '',
    bindAddr: '127.0.0.1',
    bindPort: undefined,
    disabled: false,
    keepTunnelOpen: false,
}

// Convert Visitor to form data
function visitorToFormData(visitor: Visitor): VisitorFormData {
    return {
        name: visitor.name,
        type: visitor.type,
        serverName: visitor.serverName,
        secretKey: visitor.secretKey || '',
        bindAddr: visitor.bindAddr || '127.0.0.1',
        bindPort: visitor.bindPort,
        protocol: visitor.protocol || '',
        keepTunnelOpen: visitor.keepTunnelOpen || false,
        maxRetriesAnHour: visitor.maxRetriesAnHour,
        minRetryInterval: visitor.minRetryInterval,
        fallbackTo: visitor.fallbackTo || '',
        fallbackTimeoutMs: visitor.fallbackTimeoutMs,
        disabled: visitor.disabled || false,
    }
}

// Convert form data to Visitor
function formDataToVisitor(data: VisitorFormData): Visitor {
    const visitor: Visitor = {
        name: data.name,
        type: data.type,
        serverName: data.serverName,
        disabled: data.disabled,
    }

    if (data.secretKey) visitor.secretKey = data.secretKey
    if (data.bindAddr) visitor.bindAddr = data.bindAddr
    if (data.bindPort) visitor.bindPort = data.bindPort

    // XTCP specific
    if (data.type === 'xtcp') {
        if (data.protocol) visitor.protocol = data.protocol
        if (data.keepTunnelOpen !== undefined) visitor.keepTunnelOpen = data.keepTunnelOpen
        if (data.maxRetriesAnHour) visitor.maxRetriesAnHour = data.maxRetriesAnHour
        if (data.minRetryInterval) visitor.minRetryInterval = data.minRetryInterval
        if (data.fallbackTo) visitor.fallbackTo = data.fallbackTo
        if (data.fallbackTimeoutMs) visitor.fallbackTimeoutMs = data.fallbackTimeoutMs
    }

    return visitor
}

export function VisitorDialog({ open, onOpenChange, visitor, onSave }: VisitorDialogProps) {
    const { t } = useTranslation()

    const form = useForm<VisitorFormData>({
        resolver: zodResolver(visitorFormSchema),
        defaultValues,
    })

    const { control, handleSubmit, watch, reset, formState: { errors } } = form

    useEffect(() => {
        if (open) {
            if (visitor) {
                reset(visitorToFormData(visitor))
            } else {
                reset(defaultValues)
            }
        }
    }, [visitor, open, reset])

    const watchType = watch('type')

    const onSubmit = (data: VisitorFormData) => {
        if (!data.bindPort) {
            toast.error(t('visitor.pleaseEnterBindPort'))
            return
        }

        onSave(formDataToVisitor(data))
    }

    const handleFormSubmit = handleSubmit(onSubmit)

    const isXTCP = watchType === 'xtcp'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{visitor ? t('visitor.editVisitor') : t('visitor.addVisitor')}</DialogTitle>
                    <DialogDescription>
                        {t('visitor.manageVisitorRules')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleFormSubmit}>
                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="name">{t('visitor.visitorName')}</Label>
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="name"
                                            placeholder={t('visitor.visitorNamePlaceholder')}
                                            {...field}
                                            disabled={!!visitor}
                                        />
                                    )}
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{t(errors.name.message!)}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>{t('visitor.visitorType')}</Label>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VisitorTypes.map((type) => (
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
                                <Label htmlFor="serverName">{t('visitor.serverName')}</Label>
                                <Controller
                                    name="serverName"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="serverName"
                                            placeholder={t('visitor.serverNamePlaceholder')}
                                            {...field}
                                        />
                                    )}
                                />
                                {errors.serverName && (
                                    <p className="text-sm text-destructive">{t(errors.serverName.message!)}</p>
                                )}
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="secretKey">{t('visitor.secretKey')}</Label>
                                <Controller
                                    name="secretKey"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="secretKey"
                                            type="password"
                                            placeholder={t('visitor.secretKeyPlaceholder')}
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bindAddr">{t('visitor.bindAddr')}</Label>
                                <Controller
                                    name="bindAddr"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="bindAddr"
                                            placeholder="127.0.0.1"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bindPort">{t('visitor.bindPort')}</Label>
                                <Controller
                                    name="bindPort"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="bindPort"
                                            type="number"
                                            placeholder="4004"
                                            {...field}
                                            value={field.value || ''}
                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        {/* XTCP specific */}
                        {isXTCP && (
                            <div className="space-y-4 pt-4 border-t">
                                <Label className="text-base">{t('visitor.xtcpSettings')}</Label>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="protocol">{t('visitor.protocol')}</Label>
                                        <Controller
                                            name="protocol"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    id="protocol"
                                                    placeholder="quic"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="maxRetriesAnHour">{t('visitor.maxRetriesAnHour')}</Label>
                                        <Controller
                                            name="maxRetriesAnHour"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    id="maxRetriesAnHour"
                                                    type="number"
                                                    placeholder="8"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="minRetryInterval">{t('visitor.minRetryInterval')}</Label>
                                        <Controller
                                            name="minRetryInterval"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    id="minRetryInterval"
                                                    type="number"
                                                    placeholder="90"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fallbackTo">{t('visitor.fallbackTo')}</Label>
                                        <Controller
                                            name="fallbackTo"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    id="fallbackTo"
                                                    placeholder={t('visitor.fallbackToPlaceholder')}
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="fallbackTimeoutMs">{t('visitor.fallbackTimeoutMs')}</Label>
                                        <Controller
                                            name="fallbackTimeoutMs"
                                            control={control}
                                            render={({ field }) => (
                                                <Input
                                                    id="fallbackTimeoutMs"
                                                    type="number"
                                                    placeholder="1000"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <div>
                                        <Label>{t('visitor.keepTunnelOpen')}</Label>
                                        <p className="text-sm text-muted-foreground">{t('visitor.keepTunnelOpenDesc')}</p>
                                    </div>
                                    <Controller
                                        name="keepTunnelOpen"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value || false}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                                <Label>{t('visitor.disableVisitor')}</Label>
                                <p className="text-sm text-muted-foreground">{t('visitor.disableVisitorDesc')}</p>
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
                    </div>

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
