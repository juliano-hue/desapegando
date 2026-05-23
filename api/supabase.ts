import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key)
}

export function getSupabaseBucket() {
  return (process.env.SUPABASE_BUCKET?.trim() || 'uploads').trim()
}
