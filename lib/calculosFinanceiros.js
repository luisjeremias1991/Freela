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
// para efeitos de Segurança Social.
export const PERCENTAGEM_RENDIMENTO_RELEVANTE_SS = 0.70

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

// Segurança Social a pôr de lado deste recibo — 70% do valor × taxa_ss do
// perfil. Só sobre recibos já recebidos (mesma razão que calcularIvaRecibo).
export function calcularSSRecibo(recibo, perfil) {
  if (!recibo.data_pagamento) return 0
  const taxaSS = perfil?.taxa_ss != null ? perfil.taxa_ss : TAXA_SS_PADRAO
  return recibo.valor * PERCENTAGEM_RENDIMENTO_RELEVANTE_SS * taxaSS
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
