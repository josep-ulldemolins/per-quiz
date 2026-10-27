import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from './api.ts'
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
    } catch (e) {
      // Free accounts: tests that need a plan, or no exams left today, lead to the plans page.
      if (e instanceof ApiError && (e.code === 'premium' || e.code === 'daily_limit'))
        navigate(`/planes?motivo=${e.code === 'premium' ? 'premium' : 'limite'}`)
      else setError(true)
    } finally {
      setBusy(false)
    }
  }

  return { start, busy, error }
}
