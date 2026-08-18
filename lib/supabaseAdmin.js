import { createClient } from '@supabase/supabase-js'

// Cliente só para uso no servidor (rotas de API / webhooks): usa a service role key,
// que ignora RLS. NUNCA importar isto em código que corre no browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
