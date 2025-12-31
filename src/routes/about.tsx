import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Server, Github, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function AboutPage() {
    const { t } = useTranslation()

    const openExternal = (url: string) => {
        window.open(url, '_blank')
    }

    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6 max-w-md">
                <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Server className="w-12 h-12 text-primary" />
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl font-bold">{t('about.title')}</h1>
                    <p className="text-muted-foreground mt-1">{t('about.description')}</p>
                </div>

                <div className="text-sm text-muted-foreground">
                    <p>{t('about.version', { version: '1.0.0' })}</p>
                    <p>{t('about.techStack')}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openExternal('https://github.com/fatedier/frp')}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('about.frpProject')}
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openExternal('https://github.com/koho/frpmgr')}
                    >
                        <Github className="h-4 w-4 mr-2" />
                        {t('about.referenceProject')}
                    </Button>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                    <p>{t('about.thanks')}</p>
                    <p>{t('about.thanksContributors')}</p>
                </div>

                <div className="text-xs text-muted-foreground/60">
                    <p>{t('about.license')}</p>
                </div>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/about')({
    component: AboutPage,
})
