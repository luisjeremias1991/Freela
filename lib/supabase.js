import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Passkeys (Face ID / Touch ID) fazem parte do suporte experimental (beta) da
// Supabase Auth — têm de ser ativadas explicitamente, senão qualquer chamada a
// supabase.auth.signInWithPasskey() / registerPasskey() / passkey.* falha.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    experimental: {
      passkey: true
    }
  }
})