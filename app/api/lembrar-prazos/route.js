import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { resend } from '../../../lib/resend'

function formatarData(d) {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatarDataPT(dataStr) {
  return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-PT')
}

function diasQueFaltam(dataStr, hoje) {
  const dataObrigacao = new Date(dataStr + 'T00:00:00')
  return Math.round((dataObrigacao - hoje) / (1000 * 60 * 60 * 24))
}

function textoDiasQueFaltam(dias) {
  if (dias === 0) return 'é hoje'
  if (dias === 1) return 'é amanhã'
  return `é daqui a ${dias} dias`
}

async function processarLembretes(request) {
  try {
    // Rota não pública — chamada pelo Vercel Cron (que injeta automaticamente
    // "Authorization: Bearer <CRON_SECRET>" quando essa env var está definida no
    // projeto) ou manualmente por nós a testar com o mesmo formato de header.
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const daqui7Dias = new Date(hoje)
    daqui7Dias.setDate(daqui7Dias.getDate() + 7)

    const hojeStr = formatarData(hoje)
    const daqui7DiasStr = formatarData(daqui7Dias)

    const { data: obrigacoes, error: erroObrigacoes } = await supabaseAdmin
      .from('obrigacoes')
      .select('*')
      .eq('done', false)
      .gte('data', hojeStr)
      .lte('data', daqui7DiasStr)
      // Evita duplicados no mesmo dia: só entra quem nunca recebeu lembrete
      // ou recebeu num dia anterior a hoje.
      .or(`lembrete_enviado_em.is.null,lembrete_enviado_em.lt.${hojeStr}`)

    if (erroObrigacoes) {
      console.error('Erro em lembrar-prazos (a ir buscar obrigações):', erroObrigacoes)
      return NextResponse.json({ error: erroObrigacoes.message }, { status: 500 })
    }

    const resultados = []

    for (const obrigacao of obrigacoes || []) {
      const { data: dadosUtilizador, error: erroUtilizador } = await supabaseAdmin.auth.admin.getUserById(obrigacao.user_id)
      const email = dadosUtilizador?.user?.email

      if (erroUtilizador || !email) {
        if (erroUtilizador) {
          console.error('Erro em lembrar-prazos (a ir buscar utilizador):', erroUtilizador)
        }
        resultados.push({ id: obrigacao.id, enviado: false, motivo: 'Sem email associado a este utilizador.' })
        continue
      }

      const dias = diasQueFaltam(obrigacao.data, hoje)
      const dataFormatada = formatarDataPT(obrigacao.data)

      try {
        const { error: erroEnvio } = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: email,
          subject: `Lembrete: ${obrigacao.nome} em breve`,
          html: `
            <p>Olá,</p>
            <p>A obrigação <strong>${obrigacao.nome}</strong> tem data marcada para <strong>${dataFormatada}</strong> — ${textoDiasQueFaltam(dias)}.</p>
            <p>Não te esqueças de a tratar a tempo.</p>
            <p>— Freela</p>
          `
        })

        if (erroEnvio) {
          console.error('Erro em lembrar-prazos (Resend):', erroEnvio)
          resultados.push({ id: obrigacao.id, enviado: false, motivo: erroEnvio.message })
          continue
        }

        const { error: erroUpdate } = await supabaseAdmin
          .from('obrigacoes')
          .update({ lembrete_enviado_em: hojeStr })
          .eq('id', obrigacao.id)

        if (erroUpdate) {
          console.error('Erro em lembrar-prazos (a marcar lembrete_enviado_em):', erroUpdate)
        }

        resultados.push({
          id: obrigacao.id,
          enviado: true,
          avisoAtualizacao: erroUpdate ? erroUpdate.message : undefined
        })
      } catch (erro) {
        console.error('Erro em lembrar-prazos (exceção ao processar uma obrigação):', erro)
        resultados.push({ id: obrigacao.id, enviado: false, motivo: erro.message })
      }
    }

    return NextResponse.json({ processadas: resultados.length, resultados })
  } catch (error) {
    // Apanha qualquer falha inesperada (ex. configuração em falta) que, de outra
    // forma, só apareceria como "500" sem detalhe nenhum no terminal.
    console.error('Erro em lembrar-prazos:', error)
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
