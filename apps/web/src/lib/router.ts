// Simple SPA-like router using window.history
export function useRouter() {
  return {
    push: (path: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = path
      }
    },
    back: () => {
      if (typeof window !== 'undefined') {
        window.history.back()
      }
    },
  }
}
