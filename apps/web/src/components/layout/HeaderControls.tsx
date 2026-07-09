import { useEffect, useState } from 'react'
import { Globe, Moon, Sun, Monitor } from 'lucide-react'
import { useLocaleStore, useT } from '@/stores/localeStore'
import { useThemeStore, applyTheme } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

export function HeaderControls() {
  const { locale, setLocale } = useLocaleStore()
  const { theme, setTheme } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    applyTheme(theme)
  }, [theme])

  if (!mounted) {
    return <div className="flex items-center gap-2 h-9" />
  }

  return (
    <div className="flex items-center gap-2">
      <LocaleToggle locale={locale} setLocale={setLocale} />
      <ThemeToggle theme={theme} setTheme={setTheme} />
    </div>
  )
}

function LocaleToggle({ locale, setLocale }: { locale: 'ca' | 'es'; setLocale: (l: 'ca' | 'es') => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card/50 backdrop-blur-sm px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
        aria-label="Canviar idioma"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{locale === 'ca' ? 'CA' : 'ES'}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
            <button
              onClick={() => { setLocale('ca'); setOpen(false) }}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                locale === 'ca' && 'bg-accent font-medium'
              )}
            >
              <span>Català</span>
              {locale === 'ca' && <span className="text-primary">✓</span>}
            </button>
            <button
              onClick={() => { setLocale('es'); setOpen(false) }}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                locale === 'es' && 'bg-accent font-medium'
              )}
            >
              <span>Castellano</span>
              {locale === 'es' && <span className="text-primary">✓</span>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ThemeToggle({ theme, setTheme }: { theme: 'light' | 'dark' | 'system'; setTheme: (t: 'light' | 'dark' | 'system') => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center rounded-full border border-border bg-card/50 backdrop-blur-sm p-2 hover:bg-accent transition-colors"
        aria-label="Canviar tema"
      >
        {theme === 'light' ? <Sun className="h-4 w-4" /> : 
         theme === 'dark' ? <Moon className="h-4 w-4" /> :
         <Monitor className="h-4 w-4" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
            <button onClick={() => { setTheme('light'); setOpen(false) }} className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent', theme === 'light' && 'bg-accent font-medium')}>
              <Sun className="h-4 w-4" /> Clar
            </button>
            <button onClick={() => { setTheme('dark'); setOpen(false) }} className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent', theme === 'dark' && 'bg-accent font-medium')}>
              <Moon className="h-4 w-4" /> Fosc
            </button>
            <button onClick={() => { setTheme('system'); setOpen(false) }} className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent', theme === 'system' && 'bg-accent font-medium')}>
              <Monitor className="h-4 w-4" /> Sistema
            </button>
          </div>
        </>
      )}
    </div>
  )
}
