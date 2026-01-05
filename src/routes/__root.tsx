import { useState, useEffect } from 'react'
import { Outlet, createRootRoute, Link, useLocation } from '@tanstack/react-router'
import { Server, FileText, Settings, Info, Menu, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { FrpcSetupDialog } from '@/components/frpc-setup-dialog'

function RootLayout() {
    const location = useLocation()
    const { t } = useTranslation()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [frpcChecking, setFrpcChecking] = useState(true)
    const [frpcAvailable, setFrpcAvailable] = useState(false)
    const [showSetupDialog, setShowSetupDialog] = useState(false)

    // Check frpc availability on mount
    useEffect(() => {
        checkFrpc()
    }, [])

    const checkFrpc = async () => {
        setFrpcChecking(true)
        try {
            const result = await window.electronAPI.frpc.check()
            setFrpcAvailable(result.available)
            if (!result.available) {
                setShowSetupDialog(true)
            }
        } catch (error) {
            console.error('Failed to check frpc:', error)
            setFrpcAvailable(false)
            setShowSetupDialog(true)
        } finally {
            setFrpcChecking(false)
        }
    }

    const handleSetupComplete = () => {
        setShowSetupDialog(false)
        setFrpcAvailable(true)
    }

    const navItems = [
        { to: '/', label: t('nav.config'), icon: Server },
        { to: '/logs', label: t('nav.logs'), icon: FileText },
        { to: '/settings', label: t('nav.settings'), icon: Settings },
        { to: '/about', label: t('nav.about'), icon: Info },
    ]

    const NavContent = () => (
        <>
            <nav className="flex-1 p-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.to
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 text-xs border-t text-muted-foreground">
                v1.0.0
            </div>
        </>
    )

    // Show loading while checking frpc
    if (frpcChecking) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">{t('frpcSetup.checking')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-background">
            {/* FRPC Setup Dialog - blocks UI until frpc is configured */}
            <FrpcSetupDialog
                open={showSetupDialog && !frpcAvailable}
                onSetupComplete={handleSetupComplete}
            />

            {/* Mobile: Sheet drawer */}
            <div className="md:hidden">
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="fixed top-3 left-3 z-50"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-56 p-0">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                                <Server className="w-6 h-6 text-primary" />
                                FRPC GUI
                            </SheetTitle>
                        </SheetHeader>
                        <NavContent />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop: Static sidebar */}
            <aside className="hidden md:flex flex-col w-56 border-r bg-muted/30">
                <div className="p-4 border-b">
                    <h1 className="flex items-center gap-2 text-xl font-bold">
                        <Server className="w-6 h-6 text-primary" />
                        FRPC GUI
                    </h1>
                </div>
                <NavContent />
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>

            <Toaster />
        </div>
    )
}

export const Route = createRootRoute({
    component: RootLayout,
})
