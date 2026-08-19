import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const COMISSAO_APP = 0.30

// A Cal.com assina o pedido com HMAC-SHA256 sobre o corpo em bruto, no header
// "x-cal-signature-256" (em hexadecimal, por vezes com o prefixo "sha256=").
function assinaturaValida(corpoBruto, assinaturaRecebida, segredo) {
  if (!segredo || !assinaturaRecebida) return false

  const hashCalculado = crypto.createHmac('sha256', segredo).update(corpoBruto).digest('hex')
  const assinaturaLimpa = assinaturaRecebida.replace(/^sha256=/, '')

  const bufferCalculado = Buffer.from(hashCalculado, 'hex')
  const bufferRecebido = Buffer.from(assinaturaLimpa, 'hex')

  // timingSafeEqual rebenta se os buffers tiverem tamanhos diferentes — em vez
  // de deixar isso acontecer (uma assinatura malformada faria a rota rebentar
  // com 500 em vez de simplesmente recusar com 401), verificamos primeiro.
  if (bufferCalculado.length !== bufferRecebido.length) {
    return false
  }

  return crypto.timingSafeEqual(bufferCalculado, bufferRecebido)
}

export async function POST(request) {
  try {
    const corpoBruto = await request.text()
    const assinaturaRecebida = request.headers.get('x-cal-signature-256')

    if (!assinaturaValida(corpoBruto, assinaturaRecebida, process.env.CAL_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
    }

    const evento = JSON.parse(corpoBruto)

    // Só nos interessa a criação de marcações — outros eventos (cancelamentos,
    // reagendamentos, etc.) são simplesmente confirmados sem ação por agora.
    if (evento.triggerEvent !== 'BOOKING_CREATED') {
      return NextResponse.json({ received: true })
    }

    const dados = evento.payload || {}
    const emailOrganizador = dados.organizer?.email

    if (!emailOrganizador) {
      console.error('Erro em cal-webhook: payload sem email de organizador.')
      return NextResponse.json({ error: 'Payload sem email de organizador.' }, { status: 400 })
    }

    // O email já está guardado diretamente em "contabilistas" — não depende mais
    // de ir procurar a conta em auth.users. ilike faz a comparação sem distinguir
    // maiúsculas/minúsculas (sem usar wildcards, um email não costuma conter
    // "%"/"_", por isso comporta-se aqui como uma igualdade insensível a maiúsculas).
    const { data: contabilista, error: erroContabilista } = await supabaseAdmin
      .from('contabilistas')
      .select('*')
      .ilike('email', emailOrganizador)
      .maybeSingle()

    if (erroContabilista || !contabilista) {
      console.error('Erro em cal-webhook: nenhum contabilista encontrado para o email', emailOrganizador)
      return NextResponse.json({ error: 'Contabilista não encontrado.' }, { status: 404 })
    }

    // Duração: preferimos "length" (minutos, vem sempre preenchido pela Cal.com);
    // se por algum motivo faltar, calculamos a partir de startTime/endTime.
    const duracaoHoras = dados.length != null
      ? dados.length / 60
      : (new Date(dados.endTime) - new Date(dados.startTime)) / (1000 * 60 * 60)

    const precoHora = contabilista.preco_hora || 0
    const valor = precoHora * duracaoHoras
    const comissaoApp = valor * COMISSAO_APP
    const clienteEmail = dados.attendees?.[0]?.email || null

    const { error: erroInsert } = await supabaseAdmin.from('marcacoes').insert({
      contabilista_id: contabilista.id,
      cliente_email: clienteEmail,
      data_reuniao: dados.startTime,
      valor: valor,
      comissao_app: comissaoApp,
      cal_booking_uid: dados.uid
    })

    if (erroInsert) {
      // cal_booking_uid é único — se a Cal.com reenviar o mesmo evento (acontece
      // em caso de retry deles), isto falha com conflito de chave única, que é
      // exatamente o que queremos: não duplicar a marcação nem a comissão.
      if (erroInsert.code === '23505') {
        return NextResponse.json({ received: true, duplicado: true })
      }
      console.error('Erro em cal-webhook (a inserir marcação):', erroInsert.message)
      return NextResponse.json({ error: erroInsert.message }, { status: 500 })
    }

    return NextResponse.json({ received: true })
  } catch (erro) {
    console.error('Erro em cal-webhook:', erro)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
