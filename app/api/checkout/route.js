import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '../../../lib/stripe'

const PRECOS_POR_CICLO = {
  mensal: process.env.STRIPE_PRICE_MENSAL,
  anual: process.env.STRIPE_PRICE_ANUAL
}

export async function POST(request) {
  // O utilizador autentica-se com o token da sessão Supabase (enviado no header
  // Authorization pelo cliente), nunca confiamos num email vindo diretamente do body.
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Precisas de iniciar sessão.' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: { user }, error: erroUtilizador } = await supabase.auth.getUser(token)
  if (erroUtilizador || !user) {
    return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })
  }

  let ciclo
  try {
    const body = await request.json()
    ciclo = body.ciclo
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const priceId = PRECOS_POR_CICLO[ciclo]
  if (!priceId) {
    return NextResponse.json({ error: 'Ciclo inválido — usa "mensal" ou "anual".' }, { status: 400 })
  }

  const origin = new URL(request.url).origin

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        ciclo: ciclo
      },
      success_url: `${origin}/perfil?checkout=sucesso`,
      cancel_url: `${origin}/perfil?checkout=cancelado`
    })

    return NextResponse.json({ url: session.url })
  } catch (erro) {
    return NextResponse.json({ error: erro.message }, { status: 500 })
  }
}
