import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripe'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// Converte um timestamp Unix (segundos) devolvido pela Stripe numa data 'YYYY-MM-DD'.
function timestampParaData(timestampSegundos) {
  if (!timestampSegundos) return null
  return new Date(timestampSegundos * 1000).toISOString().slice(0, 10)
}

// A Stripe não garante a ordem de entrega dos webhooks — customer.subscription.updated
// ou .deleted podem chegar antes de checkout.session.completed ter sido processado.
// Por isso não podemos depender de a linha em "perfis" já existir nem de já ter
// subscription_id preenchido; temos de conseguir identificar o utilizador só a
// partir do próprio objeto da subscrição.
async function resolverUserIdDaSubscricao(subscription) {
  // Caminho normal: subscrições criadas depois de adicionarmos subscription_data.metadata
  // em /api/checkout já trazem isto sempre, sem precisar de nenhuma chamada extra à Stripe.
  if (subscription.metadata?.user_id) {
    return subscription.metadata.user_id
  }

  // Fallback para subscrições mais antigas (criadas antes dessa alteração): a Checkout
  // Session original que gerou esta subscrição continua guardada na Stripe, com o
  // client_reference_id/metadata.user_id que lá gravámos.
  try {
    const sessoes = await stripe.checkout.sessions.list({ subscription: subscription.id, limit: 1 })
    const sessaoOriginal = sessoes.data?.[0]
    return sessaoOriginal?.client_reference_id || sessaoOriginal?.metadata?.user_id || null
  } catch (erro) {
    console.error('Erro ao ir buscar a checkout session original da subscrição:', erro)
    return null
  }
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
      // upsert, não update: se a conta for nova e nunca tiver passado por /perfil
      // antes de subscrever, ainda não existe nenhuma linha em "perfis" para este
      // utilizador — um update() sobre uma linha inexistente não dá erro, só não
      // faz nada. O upsert cria a linha se faltar, ou atualiza-a se já existir.
      const { error } = await supabaseAdmin
        .from('perfis')
        .upsert({
          id: userId,
          is_pro: true,
          pro_ciclo: ciclo,
          subscription_id: session.subscription || null
        }, { onConflict: 'id' })

      if (error) {
        console.error('Erro ao ativar Recibos Claros Pro após checkout:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
  }

  if (evento.type === 'customer.subscription.updated') {
    const subscription = evento.data.object
    const userId = await resolverUserIdDaSubscricao(subscription)

    if (!userId) {
      console.error('Erro em customer.subscription.updated: não foi possível identificar o utilizador da subscrição', subscription.id)
      return NextResponse.json({ error: 'Não foi possível identificar o utilizador da subscrição.' }, { status: 500 })
    }

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

    // upsert com o id resolvido — se este evento chegar antes de
    // checkout.session.completed, a linha é criada aqui mesmo; quando o outro
    // evento for processado, só atualiza os campos que lhe dizem respeito.
    const { error } = await supabaseAdmin
      .from('perfis')
      .upsert({
        id: userId,
        subscription_id: subscription.id,
        ...atualizacao
      }, { onConflict: 'id' })

    if (error) {
      console.error('Erro ao atualizar perfil (subscription.updated):', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (evento.type === 'customer.subscription.deleted') {
    const subscription = evento.data.object
    const userId = await resolverUserIdDaSubscricao(subscription)

    if (!userId) {
      console.error('Erro em customer.subscription.deleted: não foi possível identificar o utilizador da subscrição', subscription.id)
      return NextResponse.json({ error: 'Não foi possível identificar o utilizador da subscrição.' }, { status: 500 })
    }

    const { error } = await supabaseAdmin
      .from('perfis')
      .upsert({
        id: userId,
        is_pro: false,
        pro_cancelled: false,
        pro_ends_at: null,
        subscription_id: null
      }, { onConflict: 'id' })

    if (error) {
      console.error('Erro ao atualizar perfil (subscription.deleted):', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
