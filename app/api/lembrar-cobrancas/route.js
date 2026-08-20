import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { resend } from '../../../lib/resend'

const DIAS_LIMITE = 30

function formatarData(d) {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatarDataPT(dataStr) {
  return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-PT')
}

function diasDesde(dataStr, hoje) {
  const data = new Date(dataStr + 'T00:00:00')
  return Math.round((hoje - data) / (1000 * 60 * 60 * 24))
}

async function processarLembretes(request) {
  try {
    // Mesma proteção que /api/lembrar-prazos — a Vercel injeta automaticamente
    // "Authorization: Bearer <CRON_SECRET>" quando essa env var está definida no
    // projeto; testamos manualmente com o mesmo formato de header.
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const limiteData = new Date(hoje)
    limiteData.setDate(limiteData.getDate() - DIAS_LIMITE)

    const hojeStr = formatarData(hoje)
    const limiteDataStr = formatarData(limiteData)

    const { data: recibos, error: erroRecibos } = await supabaseAdmin
      .from('recibos')
      .select('*')
      .is('data_pagamento', null)
      .lte('data_emissao', limiteDataStr)
      // Evita duplicados no mesmo dia: só entra quem nunca recebeu este lembrete
      // ou recebeu num dia anterior a hoje.
      .or(`lembrete_cobranca_enviado_em.is.null,lembrete_cobranca_enviado_em.lt.${hojeStr}`)

    if (erroRecibos) {
      console.error('Erro em lembrar-cobrancas (a ir buscar recibos):', erroRecibos)
      return NextResponse.json({ error: erroRecibos.message }, { status: 500 })
    }

    const resultados = []

    for (const recibo of recibos || []) {
      const { data: dadosUtilizador, error: erroUtilizador } = await supabaseAdmin.auth.admin.getUserById(recibo.user_id)
      const email = dadosUtilizador?.user?.email

      if (erroUtilizador || !email) {
        if (erroUtilizador) {
          console.error('Erro em lembrar-cobrancas (a ir buscar utilizador):', erroUtilizador)
        }
        resultados.push({ id: recibo.id, enviado: false, motivo: 'Sem email associado a este utilizador.' })
        continue
      }

      const dias = diasDesde(recibo.data_emissao, hoje)
      const dataEmissaoFormatada = formatarDataPT(recibo.data_emissao)

      try {
        const { error: erroEnvio } = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: email,
          subject: `Fatura pendente: ${recibo.cliente} — ${recibo.valor}€`,
          html: `
            <p>Olá,</p>
            <p>A fatura de <strong>${recibo.cliente}</strong>, no valor de <strong>${recibo.valor}€</strong>, emitida em <strong>${dataEmissaoFormatada}</strong>, continua sem pagamento registado — já passaram <strong>${dias} dias</strong>.</p>
            <p>Pode valer a pena entrares em contacto com o cliente para agilizar o pagamento.</p>
            <p>— Recibos Claros</p>
          `
        })

        if (erroEnvio) {
          console.error('Erro em lembrar-cobrancas (Resend):', erroEnvio)
          resultados.push({ id: recibo.id, enviado: false, motivo: erroEnvio.message })
          continue
        }

        const { error: erroUpdate } = await supabaseAdmin
          .from('recibos')
          .update({ lembrete_cobranca_enviado_em: hojeStr })
          .eq('id', recibo.id)

        if (erroUpdate) {
          console.error('Erro em lembrar-cobrancas (a marcar lembrete_cobranca_enviado_em):', erroUpdate)
        }

        resultados.push({
          id: recibo.id,
          enviado: true,
          avisoAtualizacao: erroUpdate ? erroUpdate.message : undefined
        })
      } catch (erro) {
        console.error('Erro em lembrar-cobrancas (exceção ao processar um recibo):', erro)
        resultados.push({ id: recibo.id, enviado: false, motivo: erro.message })
      }
    }

    return NextResponse.json({ processadas: resultados.length, resultados })
  } catch (error) {
    // Apanha qualquer falha inesperada (ex. configuração em falta) que, de outra
    // forma, só apareceria como "500" sem detalhe nenhum no terminal.
    console.error('Erro em lembrar-cobrancas:', error)
    return NextResponse.json({ error: 'Erro interno. Ver detalhe no terminal do servidor.' }, { status: 500 })
  }
}

// Suporta GET (agendadores como o Vercel Cron chamam sempre por GET) e POST
// (para testes manuais via curl/Postman), com a mesma lógica.
export async function GET(request) {
  return processarLembretes(request)
}

export async function POST(request) {
  return processarLembretes(request)
}
