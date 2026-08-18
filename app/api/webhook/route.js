import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripe'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// Converte um timestamp Unix (segundos) devolvido pela Stripe numa data 'YYYY-MM-DD'.
function timestampParaData(timestampSegundos) {
  if (!timestampSegundos) return null
  return new Date(timestampSegundos * 1000).toISOString().slice(0, 10)
}

export async function POST(request) {
  // Tem de ser o corpo em bruto (texto), não o JSON já interpretado — a verificação
  // da assinatura da Stripe é feita sobre os bytes exatos que a Stripe enviou.
  const corpo = await request.text()
  const assinatura = request.headers.get('stripe-signature')

  let evento
  try {
    evento = stripe.webhooks.constructEvent(corpo, assinatura, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (erro) {
    return NextResponse.json({ error: `Assinatura inválida: ${erro.message}` }, { status: 400 })
  }

  if (evento.type === 'checkout.session.completed') {
    const session = evento.data.object
    const userId = session.client_reference_id || session.metadata?.user_id
    const ciclo = session.metadata?.ciclo || null

    if (userId) {
      const { error } = await supabaseAdmin
        .from('perfis')
        .update({
          is_pro: true,
          pro_ciclo: ciclo,
          subscription_id: session.subscription || null
        })
        .eq('id', userId)

      if (error) {
        console.error('Erro ao ativar Freela Pro após checkout:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  if (evento.type === 'customer.subscription.updated') {
    const subscription = evento.data.object

    // Nota: current_period_end já não existe no topo do objeto Subscription nesta
    // versão da API — vive em cada item da subscrição (subscription.items.data[]).
    const fimDoPeriodoAtual = subscription.items?.data?.[0]?.current_period_end

    const atualizacao = subscription.cancel_at_period_end
      ? {
          pro_cancelled: true,
          pro_ends_at: timestampParaData(fimDoPeriodoAtual)
        }
      : {
          pro_cancelled: false,
          pro_ends_at: null
        }

    const { error } = await supabaseAdmin
      .from('perfis')
      .update(atualizacao)
      .eq('subscription_id', subscription.id)

    if (error) {
      console.error('Erro ao atualizar perfil (subscription.updated):', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (evento.type === 'customer.subscription.deleted') {
    const subscription = evento.data.object

    const { error } = await supabaseAdmin
      .from('perfis')
      .update({
        is_pro: false,
        pro_cancelled: false,
        pro_ends_at: null,
        subscription_id: null
      })
      .eq('subscription_id', subscription.id)

    if (error) {
      console.error('Erro ao atualizar perfil (subscription.deleted):', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
