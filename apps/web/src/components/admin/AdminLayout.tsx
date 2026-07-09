import { Settings, FileText, BookOpen, Home, Sun, Moon, Monitor, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TEMAS } from '@per-quiz/shared'
import { useLocaleStore, useT } from '@/stores/localeStore'
import { useThemeStore, applyTheme } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  title: string
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/preguntas', label: 'Preguntes', icon: FileText },
  { href: '/admin/examenes', label: 'Exàmens', icon: BookOpen },
]

export function AdminLayout({ title, children }: AdminLayoutProps) {
  const [currentPath, setCurrentPath] = useState('')
  const [mounted, setMounted] = useState(false)
  const { locale, setLocale } = useLocaleStore()
  const { theme, setTheme } = useThemeStore()
  const t = useT()

  useEffect(() => {
    setCurrentPath(window.location.pathname)
    setMounted(true)
    applyTheme(theme)
  }, [theme])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-9 w-9 transition-transform group-hover:scale-110">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0EA5E9" />
                  <stop offset="50%" stopColor="#06B6D4" />
                  <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="100" height="100" rx="22" fill="url(#grad1)" />
              <path d="M 10 65 Q 25 55, 40 65 T 70 65 T 90 65" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5" />
              <path d="M 10 75 Q 25 65, 40 75 T 70 75 T 90 75" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.4" />
              <path d="M 50 25 L 50 60 L 65 60 Z" fill="white" />
              <path d="M 50 25 L 50 60 L 35 60 Z" fill="white" opacity="0.7" />
              <path d="M 28 60 L 72 60 L 68 70 L 32 70 Z" fill="white" />
              <line x1="50" y1="20" x2="50" y2="60" stroke="white" strokeWidth="2.5" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight">PER Quiz</span>
              <span className="text-xs text-muted-foreground">Tests oficials</span>
            </div>
          </a>
          <div className="flex items-center gap-2">
            {mounted && (
              <>
                <button
                  onClick={() => setLocale(locale === 'ca' ? 'es' : 'ca')}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card/50 backdrop-blur-sm px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{locale === 'ca' ? 'CA' : 'ES'}</span>
                </button>
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="flex items-center justify-center rounded-full border border-border bg-card/50 backdrop-blur-sm p-2 hover:bg-accent transition-colors"
                >
                  {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container max-w-7xl py-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin · {title}</h1>
          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
            DEV ONLY
          </span>
        </div>
        <nav className="flex gap-1 mb-6 border-b border-border">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = currentPath === item.href || (item.href !== '/admin' && currentPath.startsWith(item.href))
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            )
          })}
        </nav>
        {children}
      </div>
    </div>
  )
}
