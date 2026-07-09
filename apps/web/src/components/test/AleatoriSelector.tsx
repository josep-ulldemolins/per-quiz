import { useState } from 'react'
import { Shuffle, Play, Settings2 } from 'lucide-react'
import { useT } from '@/stores/localeStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const COUNT_OPTIONS = [10, 20, 30, 45, 60, 90] as const

export function AleatoriSelector() {
  const t = useT()
  const [count, setCount] = useState(20)
  const [withTimer, setWithTimer] = useState(true)

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white mb-4">
          <Shuffle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          {t.home.modes.aleatori.title}
        </h1>
        <p className="text-muted-foreground">
          {t.home.modes.aleatori.description}
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuració
          </CardTitle>
          <CardDescription>
            Tria la configuració del teu test aleatori
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">{t.selectors.numQuestions}</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {COUNT_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  className={`py-3 rounded-lg border-2 font-mono font-bold transition-all ${
                    count === c
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div>
              <p className="text-sm font-medium">Mode examen (amb temps)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {withTimer ? '60 minuts' : 'Sense límit de temps'}
              </p>
            </div>
            <button
              onClick={() => setWithTimer(!withTimer)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                withTimer ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  withTimer ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <Button
            asChild
            variant="gradient"
            size="lg"
            className="w-full text-base"
          >
            <a href={`/test/aleatori/run?n=${count}&t=${withTimer ? 1 : 0}`}>
              <Play className="h-4 w-4 mr-2" />
              {t.selectors.start}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
