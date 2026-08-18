import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '../../../lib/stripe'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export async function POST(request) {
  // Mesma verificação de identidade usada em /api/checkout — nunca confiamos
  // num subscription_id vindo diretamente do corpo do pedido.
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

  let acao
  try {
    const body = await request.json()
    acao = body.acao
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  if (acao !== 'cancelar' && acao !== 'reativar') {
    return NextResponse.json({ error: 'Ação inválida — usa "cancelar" ou "reativar".' }, { status: 400 })
  }

  const { data: perfil, error: erroPerfil } = await supabaseAdmin
    .from('perfis')
    .select('subscription_id')
    .eq('id', user.id)
    .maybeSingle()

  if (erroPerfil || !perfil?.subscription_id) {
    return NextResponse.json({ error: 'Não encontrámos nenhuma subscrição ativa para esta conta.' }, { status: 404 })
  }

  try {
    await stripe.subscriptions.update(perfil.subscription_id, {
      // 'cancelar' agenda o fim para o final do período já pago (não corta o acesso já);
      // 'reativar' desfaz esse agendamento, mantendo a subscrição ativa normalmente.
      cancel_at_period_end: acao === 'cancelar'
    })

    return NextResponse.json({ success: true })
  } catch (erro) {
    return NextResponse.json({ error: erro.message }, { status: 500 })
  }
}
