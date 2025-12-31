import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ConfigList } from '@/components/config/config-list'
import { ConfigDetail } from '@/components/config/config-detail'
import { useConfigStore } from '@/stores/config-store'

function IndexPage() {
    const { loadConfigs, selectedConfigId } = useConfigStore()

    useEffect(() => {
        loadConfigs()
    }, [loadConfigs])

    return (
        <div className="flex h-full">
            {/* Config list sidebar */}
            <div className="w-72 border-r">
                <ConfigList />
            </div>

            {/* Config detail */}
            <div className="flex-1">
                {selectedConfigId ? (
                    <ConfigDetail />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        选择一个配置开始
                    </div>
                )}
            </div>
        </div>
    )
}

export const Route = createFileRoute('/')({
    component: IndexPage,
})
