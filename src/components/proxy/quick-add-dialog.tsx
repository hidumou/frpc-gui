import { useState } from 'react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { type Proxy } from '@/types'
import { Globe, Monitor, Terminal, Server, FolderOpen, Gamepad2 } from 'lucide-react'

interface QuickAddDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (proxy: Proxy) => void
}

type QuickAddType = 'web' | 'rdp' | 'ssh' | 'ftp' | 'custom' | 'game'

const quickAddOptions: { type: QuickAddType; label: string; icon: React.ReactNode; description: string }[] = [
    { type: 'web', label: 'Web 服务', icon: <Globe className="h-5 w-5" />, description: 'HTTP/HTTPS 网站' },
    { type: 'rdp', label: '远程桌面', icon: <Monitor className="h-5 w-5" />, description: 'Windows RDP (3389)' },
    { type: 'ssh', label: 'SSH 终端', icon: <Terminal className="h-5 w-5" />, description: 'SSH 服务器 (22)' },
    { type: 'ftp', label: 'FTP 服务', icon: <FolderOpen className="h-5 w-5" />, description: 'FTP 文件服务 (21)' },
    { type: 'game', label: '游戏服务', icon: <Gamepad2 className="h-5 w-5" />, description: '游戏服务器' },
    { type: 'custom', label: '自定义端口', icon: <Server className="h-5 w-5" />, description: 'TCP/UDP 端口转发' },
]

const defaultPorts: Record<QuickAddType, { local: number; remote?: number; type: 'tcp' | 'udp' | 'http' | 'https' }> = {
    web: { local: 80, type: 'http' },
    rdp: { local: 3389, remote: 3389, type: 'tcp' },
    ssh: { local: 22, remote: 22, type: 'tcp' },
    ftp: { local: 21, remote: 21, type: 'tcp' },
    game: { local: 25565, remote: 25565, type: 'tcp' },
    custom: { local: 8080, remote: 8080, type: 'tcp' },
}

export function QuickAddDialog({ open, onOpenChange, onSave }: QuickAddDialogProps) {
    const { toast } = useToast()
    const [selectedType, setSelectedType] = useState<QuickAddType | null>(null)
    const [name, setName] = useState('')
    const [localPort, setLocalPort] = useState(8080)
    const [remotePort, setRemotePort] = useState(8080)
    const [domain, setDomain] = useState('')
    const [proxyType, setProxyType] = useState<'tcp' | 'udp' | 'http' | 'https'>('tcp')

    const handleSelectType = (type: QuickAddType) => {
        setSelectedType(type)
        const defaults = defaultPorts[type]
        setLocalPort(defaults.local)
        setRemotePort(defaults.remote || defaults.local)
        setProxyType(defaults.type)
        setName('')
        setDomain('')
    }

    const handleBack = () => {
        setSelectedType(null)
    }

    const handleSave = () => {
        if (!name.trim()) {
            toast({ title: '请输入代理名称', variant: 'destructive' })
            return
        }

        if (['http', 'https'].includes(proxyType) && !domain) {
            toast({ title: '请输入域名', variant: 'destructive' })
            return
        }

        const proxy: Proxy = {
            name: name.trim(),
            type: proxyType,
            localIP: '127.0.0.1',
            localPort,
            remotePort: ['tcp', 'udp'].includes(proxyType) ? remotePort : undefined,
            customDomains: ['http', 'https'].includes(proxyType) ? [domain] : undefined,
        }

        onSave(proxy)
        onOpenChange(false)
        setSelectedType(null)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                {!selectedType ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>快速添加代理</DialogTitle>
                            <DialogDescription>选择要添加的代理类型</DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-3 py-4">
                            {quickAddOptions.map((option) => (
                                <button
                                    key={option.type}
                                    onClick={() => handleSelectType(option.type)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-center"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        {option.icon}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{option.label}</div>
                                        <div className="text-xs text-muted-foreground">{option.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                {quickAddOptions.find((o) => o.type === selectedType)?.label}
                            </DialogTitle>
                            <DialogDescription>配置代理参数</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>代理名称</Label>
                                <Input
                                    placeholder={`my-${selectedType}`}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            {selectedType === 'custom' && (
                                <div className="space-y-2">
                                    <Label>代理类型</Label>
                                    <Select value={proxyType} onValueChange={(v) => setProxyType(v as typeof proxyType)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tcp">TCP</SelectItem>
                                            <SelectItem value="udp">UDP</SelectItem>
                                            <SelectItem value="http">HTTP</SelectItem>
                                            <SelectItem value="https">HTTPS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>本地端口</Label>
                                    <Input
                                        type="number"
                                        value={localPort}
                                        onChange={(e) => setLocalPort(parseInt(e.target.value) || 0)}
                                    />
                                </div>

                                {['tcp', 'udp'].includes(proxyType) && (
                                    <div className="space-y-2">
                                        <Label>远程端口</Label>
                                        <Input
                                            type="number"
                                            value={remotePort}
                                            onChange={(e) => setRemotePort(parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                )}
                            </div>

                            {['http', 'https'].includes(proxyType) && (
                                <div className="space-y-2">
                                    <Label>域名</Label>
                                    <Input
                                        placeholder="example.com"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleBack}>
                                返回
                            </Button>
                            <Button onClick={handleSave}>添加</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
