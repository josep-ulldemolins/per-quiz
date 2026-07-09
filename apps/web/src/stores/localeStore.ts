import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '@per-quiz/shared'
import { DEFAULT_LOCALE, detectLocale, translations } from '@per-quiz/shared'

interface LocaleStore {
  locale: Locale
  setLocale: (l: Locale) => void
  toggleLocale: () => void
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set, get) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'ca' ? 'es' : 'ca' }),
    }),
    {
      name: 'per-quiz-locale',
      onRehydrateStorage: () => (state) => {
        if (typeof window !== 'undefined' && !state) {
          const detected = detectLocale()
          useLocaleStore.setState({ locale: detected })
        }
      },
    }
  )
)

// Hook to get translations
export function useT() {
  const locale = useLocaleStore(s => s.locale)
  return translations[locale]
}
