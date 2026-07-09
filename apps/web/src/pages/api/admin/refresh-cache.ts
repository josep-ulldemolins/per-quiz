// apps/web/src/pages/api/admin/refresh-cache.ts
// POST: Forçar refresc del cache (invalida la cache de localDataCache)

import type { APIRoute } from 'astro'

export const prerender = false

export const POST: APIRoute = async () => {
  if (!import.meta.env.DEV) {
    return new Response('Forbidden', { status: 403 })
  }

  // Note: this only affects the SSR side. Client-side cache
  // is invalidated by the AdminDashboard calling invalidateLocalCache()
  return new Response(
    JSON.stringify({ success: true, message: 'Cache refrescat' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
