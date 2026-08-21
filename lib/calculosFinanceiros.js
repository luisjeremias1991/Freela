// Módulo único para todos os cálculos financeiros derivados de recibos —
// substitui as cópias que existiam espalhadas em app/painel/page.js (Painel
// e, dentro do mesmo ficheiro, a versão "só este mês" para o Orçamento
// pessoal). Nada aqui sabe de React, Supabase ou UI: só recebe recibos/perfil
// e devolve números, para ser fácil de testar isoladamente (ver
// __tests__/calculosFinanceiros.test.js).
//
// Decisão (auditoria de cálculos financeiros): "Pôr de lado" (IVA, SS, IRS) e
// "Lucro líquido real" baseiam-se sempre em RECEBIDO — só recibos com
// data_pagamento preenchida entram nestes cálculos. Um recibo faturado mas
// ainda não pago não gera nenhuma obrigação a pôr de lado nem entra no lucro,
// porque ainda não existe dinheiro nenhum para pôr de lado. "Faturado"
// continua a incluir todos os recibos, pagos ou não — os dois conceitos
// respondem a perguntas diferentes por definição.

// Única fonte da taxa de retenção — antes estava repetida como 0.115 em
// vários sítios (recebido, recebidoMesAtual, irsSemRetencaoAPorDeLado,
// porDeLadoMesAtual). Não há percentagem própria guardada por recibo (é só
// um checkbox sim/não), por isso esta constante é sempre a usada.
export const TAXA_RETENCAO_PADRAO = 0.115

// Taxa de Segurança Social por defeito, quando o perfil ainda não tem
// taxa_ss definida (ex. conta recém-criada).
export const TAXA_SS_PADRAO = 0.214

// Taxa de IVA do regime normal.
export const TAXA_IVA_REGIME_NORMAL = 0.23

// Percentagem do valor de cada recibo considerada "rendimento relevante"
// para efeitos de Segurança Social — não é sempre a mesma, depende do tipo
// de atividade. Cálculo simplificado, a confirmar sempre com um
// contabilista (as regras reais têm mais exceções do que estas duas).
export const PERCENTAGEM_RENDIMENTO_RELEVANTE_SERVICOS = 0.70
export const PERCENTAGEM_RENDIMENTO_RELEVANTE_BENS = 0.20

// A única das três categorias do Perfil que corresponde a produção/venda de
// bens — as outras duas (profissão liberal 75%, outros serviços 35%) são
// prestação de serviços. Comparação exata segura: 0.15 vem sempre de
// parseFloat('0.15') no formulário do Perfil, que produz o mesmo valor de
// ponto flutuante que o literal 0.15 aqui.
const COEFICIENTE_VENDA_DE_MERCADORIAS = 0.15

// Decide a percentagem de rendimento relevante a partir da categoria de
// atividade — usada tanto aqui (Painel/Orçamento) como no Simulador, para as
// duas nunca poderem divergir. Cada recibo pode ter a sua própria categoria
// (editável por recibo, para o dia em que houver mais do que uma atividade);
// recibo?.categoria_coeficiente tem sempre prioridade sobre a do perfil, que
// serve de fallback — sobretudo para recibos antigos, criados antes deste
// campo existir, que ficam sempre com este campo vazio. "recibo" é opcional:
// passa null quando não há um recibo real (ex. o Simulador, que só trabalha
// com a categoria do perfil).
export function percentagemRendimentoRelevanteSS(recibo, perfil) {
  const categoria = recibo?.categoria_coeficiente ?? perfil?.categoria_coeficiente
  return categoria === COEFICIENTE_VENDA_DE_MERCADORIAS
    ? PERCENTAGEM_RENDIMENTO_RELEVANTE_BENS
    : PERCENTAGEM_RENDIMENTO_RELEVANTE_SERVICOS
}

// Redução regional da taxa de retenção de IRS — as Regiões Autónomas têm
// taxas de retenção reduzidas por lei, por um coeficiente aplicado sobre a
// taxa "de Continente". ⚠️ Valores a confirmar com um contabilista: não
// encontrámos uma fonte primária a confirmar estes números especificamente
// para retenção de Categoria B (só indícios consistentes de -20%/-30%,
// ligados ao mecanismo geral de redução fiscal regional) — trata como
// aproximação, não como facto verificado.
export const REDUCAO_RETENCAO_ACORES = 0.20
export const REDUCAO_RETENCAO_MADEIRA = 0.30

// Aplica a redução da região à taxa "de Continente" — devolve a própria taxa
// inalterada se a região for 'continente', vazia, ou desconhecida.
export function taxaRetencaoRegional(taxaContinente, regiao) {
  if (regiao === 'acores') return taxaContinente * (1 - REDUCAO_RETENCAO_ACORES)
  if (regiao === 'madeira') return taxaContinente * (1 - REDUCAO_RETENCAO_MADEIRA)
  return taxaContinente
}

// --- Por recibo ---

// Valor bruto faturado — nunca desconta nada, independentemente do estado de
// pagamento ou de retenção. "Faturado" é sempre isto, para todos os recibos.
export function calcularFaturado(recibo) {
  return recibo.valor
}

// Valor que efetivamente chega à conta: 0 se ainda não foi pago; o valor
// menos a retenção na fonte se o recibo tiver retenção; o valor completo caso
// contrário.
export function calcularRecebido(recibo) {
  if (!recibo.data_pagamento) return 0
  return recibo.retencao ? recibo.valor * (1 - TAXA_RETENCAO_PADRAO) : recibo.valor
}

// IVA a pôr de lado deste recibo. 0 se o perfil estiver isento (ou sem regime
// definido) e 0 se o recibo ainda não foi pago — a verificação de
// data_pagamento aqui dentro é o que garante a decisão "Pôr de lado" = base
// RECEBIDO, mesmo que uma chamada futura se esqueça de pré-filtrar.
export function calcularIvaRecibo(recibo, perfil) {
  if (!recibo.data_pagamento) return 0
  if (perfil?.regime_iva !== 'normal') return 0
  return recibo.valor * TAXA_IVA_REGIME_NORMAL
}

// Segurança Social a pôr de lado deste recibo — rendimento relevante (70%
// para serviços, 20% para venda de bens, ver percentagemRendimentoRelevanteSS)
// × taxa_ss do perfil. Só sobre recibos já recebidos (mesma razão que
// calcularIvaRecibo).
export function calcularSSRecibo(recibo, perfil) {
  if (!recibo.data_pagamento) return 0
  const taxaSS = perfil?.taxa_ss != null ? perfil.taxa_ss : TAXA_SS_PADRAO
  return recibo.valor * percentagemRendimentoRelevanteSS(recibo, perfil) * taxaSS
}

// IRS a pôr de lado deste recibo — só recibos SEM retenção (nos que têm
// retenção, o cliente já entregou o IRS ao Estado) e já recebidos.
export function calcularIrsRecibo(recibo) {
  if (!recibo.data_pagamento) return 0
  if (recibo.retencao) return 0
  return recibo.valor * TAXA_RETENCAO_PADRAO
}

// --- Agregadores ---
// somarFaturado e somarRecebido aceitam qualquer lista de recibos (fazem a
// sua própria verificação de data_pagamento quando relevante). somarPorDeLado
// e calcularLucroLiquido esperam receber só recibos já filtrados por "pago"
// — quem chama é que decide o âmbito (todos os pagos do ano, só os pagos
// este mês, etc.); estas funções não sabem nem querem saber a diferença. As
// verificações de data_pagamento dentro de calcularIvaRecibo/SS/Irs acima
// ficam como rede de segurança, não como mecanismo principal de filtragem.

export function somarFaturado(recibos) {
  return recibos.reduce((soma, r) => soma + calcularFaturado(r), 0)
}

export function somarRecebido(recibos) {
  return recibos.reduce((soma, r) => soma + calcularRecebido(r), 0)
}

export function somarPorDeLado(recibosPagos, perfil) {
  return recibosPagos.reduce(
    (acc, r) => {
      const iva = calcularIvaRecibo(r, perfil)
      const ss = calcularSSRecibo(r, perfil)
      const irs = calcularIrsRecibo(r)
      return {
        iva: acc.iva + iva,
        ss: acc.ss + ss,
        irs: acc.irs + irs,
        total: acc.total + iva + ss + irs
      }
    },
    { iva: 0, ss: 0, irs: 0, total: 0 }
  )
}

// Lucro líquido real = recebido − (IVA + SS + IRS a pôr de lado) −
// pagamentos por conta. recibosPagos deve vir já filtrado pelo chamador
// (mesma convenção de somarPorDeLado).
export function calcularLucroLiquido(recibosPagos, perfil, pagamentosPorConta = 0) {
  const recebido = somarRecebido(recibosPagos)
  const porDeLado = somarPorDeLado(recibosPagos, perfil)
  return recebido - porDeLado.total - pagamentosPorConta
}
