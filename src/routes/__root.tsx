import { Outlet, createRootRoute, Link, useLocation } from '@tanstack/react-router'
import { Server, FileText, Settings, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/toaster'
import { useTranslation } from 'react-i18next'

function RootLayout() {
    const location = useLocation()
    const { t } = useTranslation()

    const navItems = [
        { to: '/', label: t('nav.config'), icon: Server },
        { to: '/logs', label: t('nav.logs'), icon: FileText },
        { to: '/settings', label: t('nav.settings'), icon: Settings },
        { to: '/about', label: t('nav.about'), icon: Info },
    ]

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="flex flex-col w-56 border-r bg-muted/30">
                <div className="p-4 border-b">
                    <h1 className="flex items-center gap-2 text-xl font-bold">
                        <Server className="w-6 h-6 text-primary" />
                        FRP GUI
                    </h1>
                </div>
                <nav className="flex-1 p-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.to
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
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
