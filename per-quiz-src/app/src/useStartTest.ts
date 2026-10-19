import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api.ts'
import { useApp } from './store.tsx'

type NewAttempt = Parameters<typeof api.createAttempt>[0]

export function useStartTest() {
  const navigate = useNavigate()
  const { refresh } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function start(a: NewAttempt) {
    if (!a.questionIds.length) return
    setBusy(true)
    setError(false)
    try {
      const attempt = await api.createAttempt(a)
      refresh().catch(() => {})
      navigate(`/test/${attempt.id}`)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return { start, busy, error }
}
