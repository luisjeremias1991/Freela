import {
  TAXA_RETENCAO_PADRAO,
  TAXA_SS_PADRAO,
  calcularFaturado,
  calcularRecebido,
  calcularIvaRecibo,
  calcularSSRecibo,
  calcularIrsRecibo,
  somarFaturado,
  somarRecebido,
  somarPorDeLado,
  calcularLucroLiquido,
  calcularCenarioSimulador,
  taxaRetencaoRegional
} from '../lib/calculosFinanceiros'

// Perfis de referência usados em vários testes.
const PERFIL_ISENTO = { regime_iva: 'isento', taxa_ss: 0.214 }
const PERFIL_NORMAL = { regime_iva: 'normal', taxa_ss: 0.214 }

// Recibos de referência.
const recibo = (overrides) => ({
  valor: 1000,
  data_pagamento: '2026-08-10',
  retencao: false,
  ...overrides
})

describe('calcularFaturado', () => {
  it('devolve sempre o valor bruto, pago ou não', () => {
    expect(calcularFaturado(recibo({ valor: 1000, data_pagamento: null }))).toBe(1000)
    expect(calcularFaturado(recibo({ valor: 1000, data_pagamento: '2026-08-10' }))).toBe(1000)
  })
})

describe('calcularRecebido', () => {
  it('recibo pago sem retenção → valor completo', () => {
    expect(calcularRecebido(recibo({ valor: 1000, retencao: false }))).toBe(1000)
  })

  it('recibo pago com retenção → valor menos 11,5%', () => {
    const resultado = calcularRecebido(recibo({ valor: 1000, retencao: true }))
    expect(resultado).toBeCloseTo(885, 2)
  })

  it('recibo pendente (sem data_pagamento) → 0, mesmo com retenção', () => {
    expect(calcularRecebido(recibo({ valor: 1000, data_pagamento: null, retencao: true }))).toBe(0)
    expect(calcularRecebido(recibo({ valor: 1000, data_pagamento: null, retencao: false }))).toBe(0)
  })

  it('respeita a taxa de retenção padrão exportada, não um valor fixo à parte', () => {
    const esperado = 1000 * (1 - TAXA_RETENCAO_PADRAO)
    expect(calcularRecebido(recibo({ valor: 1000, retencao: true }))).toBeCloseTo(esperado, 2)
  })
})

describe('calcularIvaRecibo', () => {
  it('perfil isento → 0, mesmo com valor alto e recibo pago', () => {
    expect(calcularIvaRecibo(recibo({ valor: 10000 }), PERFIL_ISENTO)).toBe(0)
  })

  it('perfil sem regime_iva definido (null) → tratado como isento, não rebenta', () => {
    expect(calcularIvaRecibo(recibo({ valor: 1000 }), { taxa_ss: 0.214 })).toBe(0)
    expect(calcularIvaRecibo(recibo({ valor: 1000 }), null)).toBe(0)
  })

  it('perfil regime normal, recibo pago → 23% do valor', () => {
    expect(calcularIvaRecibo(recibo({ valor: 1000 }), PERFIL_NORMAL)).toBeCloseTo(230, 2)
  })

  it('perfil regime normal, recibo pendente → 0 (base é recebido, não faturado)', () => {
    expect(calcularIvaRecibo(recibo({ valor: 1000, data_pagamento: null }), PERFIL_NORMAL)).toBe(0)
  })
})

describe('calcularSSRecibo', () => {
  it('recibo pago, profissão liberal (0.75) → 70% do valor × taxa_ss do perfil', () => {
    const resultado = calcularSSRecibo(recibo({ valor: 1000 }), { taxa_ss: 0.214, categoria_coeficiente: 0.75 })
    expect(resultado).toBeCloseTo(1000 * 0.70 * 0.214, 2)
  })

  it('recibo pago, outros serviços (0.35) → também 70% (é serviço, não bens)', () => {
    const resultado = calcularSSRecibo(recibo({ valor: 1000 }), { taxa_ss: 0.214, categoria_coeficiente: 0.35 })
    expect(resultado).toBeCloseTo(1000 * 0.70 * 0.214, 2)
  })

  it('recibo pago, venda de mercadorias (0.15) → 20% do valor, não 70%', () => {
    const resultado = calcularSSRecibo(recibo({ valor: 1000 }), { taxa_ss: 0.214, categoria_coeficiente: 0.15 })
    expect(resultado).toBeCloseTo(1000 * 0.20 * 0.214, 2)
  })

  it('perfil sem categoria_coeficiente definida → assume serviços (70%), não rebenta', () => {
    const resultado = calcularSSRecibo(recibo({ valor: 1000 }), { taxa_ss: 0.214 })
    expect(resultado).toBeCloseTo(1000 * 0.70 * 0.214, 2)
  })

  it('perfil sem taxa_ss definida → usa 21,4% por defeito', () => {
    const resultado = calcularSSRecibo(recibo({ valor: 1000 }), {})
    expect(resultado).toBeCloseTo(1000 * 0.70 * 0.214, 2)
  })

  it('recibo pendente → 0', () => {
    expect(calcularSSRecibo(recibo({ valor: 1000, data_pagamento: null }), { taxa_ss: 0.214 })).toBe(0)
  })

  it('categoria do recibo tem prioridade sobre a do perfil', () => {
    // Perfil é "profissão liberal" (70%), mas este recibo específico foi
    // marcado como "venda de mercadorias" (20%) — o recibo ganha.
    const resultado = calcularSSRecibo(
      recibo({ valor: 1000, categoria_coeficiente: 0.15 }),
      { taxa_ss: 0.214, categoria_coeficiente: 0.75 }
    )
    expect(resultado).toBeCloseTo(1000 * 0.20 * 0.214, 2)
  })

  it('recibo sem categoria própria (antigo, criado antes deste campo existir) → usa a do perfil', () => {
    const resultado = calcularSSRecibo(
      recibo({ valor: 1000 }), // sem categoria_coeficiente
      { taxa_ss: 0.214, categoria_coeficiente: 0.15 }
    )
    expect(resultado).toBeCloseTo(1000 * 0.20 * 0.214, 2)
  })
})

describe('calcularIrsRecibo', () => {
  it('com retenção → 0 (já foi retido pelo cliente)', () => {
    expect(calcularIrsRecibo(recibo({ valor: 1000, retencao: true }))).toBe(0)
  })

  it('sem retenção, pago → 11,5%', () => {
    expect(calcularIrsRecibo(recibo({ valor: 1000, retencao: false }))).toBeCloseTo(115, 2)
  })

  it('sem retenção, pendente → 0', () => {
    expect(calcularIrsRecibo(recibo({ valor: 1000, retencao: false, data_pagamento: null }))).toBe(0)
  })
})

describe('somarPorDeLado e calcularLucroLiquido — caso composto', () => {
  // 2 recibos pagos (1 com retenção, 1 sem) + 1 pendente, perfil em regime
  // normal de IVA. O recibo pendente não deve contribuir para nada.
  const recibos = [
    recibo({ valor: 1000, retencao: true, data_pagamento: '2026-08-01' }), // pago, com retenção
    recibo({ valor: 500, retencao: false, data_pagamento: '2026-08-15' }), // pago, sem retenção
    recibo({ valor: 2000, retencao: false, data_pagamento: null }) // pendente — não deve contar para nada
  ]
  const recibosPagos = recibos.filter((r) => !!r.data_pagamento)

  it('recibo pendente não entra em nenhuma obrigação', () => {
    const porDeLadoComPendente = somarPorDeLado(recibos, PERFIL_NORMAL)
    const porDeLadoSoPagos = somarPorDeLado(recibosPagos, PERFIL_NORMAL)
    // Mesmo passando a lista toda (incluindo o pendente), o cálculo por
    // recibo já o neutraliza — os dois resultados têm de ser iguais.
    expect(porDeLadoComPendente).toEqual(porDeLadoSoPagos)
  })

  it('somarPorDeLado bate certo à mão', () => {
    const resultado = somarPorDeLado(recibosPagos, PERFIL_NORMAL)

    // IVA: 23% de (1000 + 500) = 345
    expect(resultado.iva).toBeCloseTo(345, 2)
    // SS: 70% × 0,214 × (1000 + 500) = 224,7
    expect(resultado.ss).toBeCloseTo(1500 * 0.70 * 0.214, 2)
    // IRS: só o recibo sem retenção (500) × 11,5% = 57,5
    expect(resultado.irs).toBeCloseTo(57.5, 2)
    expect(resultado.total).toBeCloseTo(resultado.iva + resultado.ss + resultado.irs, 2)
  })

  it('recibo pendente não entra no lucro líquido', () => {
    const lucroComPendente = calcularLucroLiquido(recibos, PERFIL_NORMAL, 0)
    const lucroSoPagos = calcularLucroLiquido(recibosPagos, PERFIL_NORMAL, 0)
    expect(lucroComPendente).toBeCloseTo(lucroSoPagos, 2)
  })

  it('lucro líquido bate certo à mão, incluindo pagamentos por conta', () => {
    // Recebido: 1000×0,885 (com retenção) + 500 (sem retenção) = 1385
    const recebidoEsperado = 1000 * 0.885 + 500
    const porDeLado = somarPorDeLado(recibosPagos, PERFIL_NORMAL)
    const pagamentosPorConta = 50

    const resultado = calcularLucroLiquido(recibosPagos, PERFIL_NORMAL, pagamentosPorConta)
    expect(resultado).toBeCloseTo(recebidoEsperado - porDeLado.total - pagamentosPorConta, 2)
  })

  it('lista vazia → tudo a zero, sem rebentar', () => {
    expect(somarPorDeLado([], PERFIL_NORMAL)).toEqual({ iva: 0, ss: 0, irs: 0, total: 0 })
    expect(calcularLucroLiquido([], PERFIL_NORMAL, 0)).toBe(0)
  })
})

describe('calcularCenarioSimulador', () => {
  it('continente, não é 1º ano, profissão liberal — bate certo à mão', () => {
    const resultado = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'continente',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214
    })
    expect(resultado.taxaIrs).toBeCloseTo(0.115, 4)
    expect(resultado.taxaSS).toBeCloseTo(0.70 * 0.214, 4)
    expect(resultado.irs).toBeCloseTo(115, 2)
    expect(resultado.ss).toBeCloseTo(1000 * 0.70 * 0.214, 2)
    expect(resultado.liquido).toBeCloseTo(1000 - resultado.irs - resultado.ss, 2)
  })

  it('1º ano de atividade → SS a 0, independentemente da região ou categoria', () => {
    const resultado = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: true,
      regiao: 'continente',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214
    })
    expect(resultado.taxaSS).toBe(0)
    expect(resultado.ss).toBe(0)
    // Taxa de IRS de 1º ano é 25%, não 11,5%.
    expect(resultado.taxaIrs).toBeCloseTo(0.25, 4)
    expect(resultado.liquido).toBeCloseTo(1000 - resultado.irs, 2)
  })

  it('venda de mercadorias (0.15) → 20% de rendimento relevante, não 70%', () => {
    const resultado = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'continente',
      categoriaCoeficiente: 0.15,
      taxaSSPerfil: 0.214
    })
    expect(resultado.percentagemRendimentoRelevante).toBeCloseTo(0.20, 4)
    expect(resultado.ss).toBeCloseTo(1000 * 0.20 * 0.214, 2)
  })

  it('Açores/Madeira aplicam a mesma redução de taxaRetencaoRegional', () => {
    const continente = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'continente',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214
    })
    const acores = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'acores',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214
    })
    const madeira = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'madeira',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214
    })
    expect(acores.taxaIrs).toBeCloseTo(taxaRetencaoRegional(continente.taxaIrs, 'acores'), 4)
    expect(madeira.taxaIrs).toBeCloseTo(taxaRetencaoRegional(continente.taxaIrs, 'madeira'), 4)
    // Região reduz o IRS, o que só pode aumentar (ou manter) o líquido.
    expect(acores.liquido).toBeGreaterThan(continente.liquido)
    expect(madeira.liquido).toBeGreaterThan(continente.liquido)
  })

  it('taxaSSPerfil não definida (null/undefined) → usa TAXA_SS_PADRAO', () => {
    const resultado = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'continente',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: null
    })
    expect(resultado.taxaSS).toBeCloseTo(0.70 * TAXA_SS_PADRAO, 4)
  })

  it('acumula_outro_trabalho → SS a 0, mesmo sem ser 1º ano', () => {
    const resultado = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'continente',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214,
      acumulaOutroTrabalho: true
    })
    expect(resultado.taxaSS).toBe(0)
    expect(resultado.ss).toBe(0)
    // Ao contrário do 1º ano, acumular não muda a taxa de IRS.
    expect(resultado.taxaIrs).toBeCloseTo(0.115, 4)
    expect(resultado.liquido).toBeCloseTo(1000 - resultado.irs, 2)
  })

  it('acumula_outro_trabalho e 1º ano juntos → continua só SS a 0 (não duplica isenção)', () => {
    const resultado = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: true,
      regiao: 'continente',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214,
      acumulaOutroTrabalho: true
    })
    expect(resultado.ss).toBe(0)
  })

  it('acumulaOutroTrabalho não definido (omitido) → tratado como false, sem rebentar', () => {
    const resultado = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'continente',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214
    })
    expect(resultado.ss).toBeCloseTo(1000 * 0.70 * 0.214, 2)
  })

  it('não recebe nem usa retencaoFonte — o líquido é o mesmo com ou sem retenção', () => {
    // A retenção nunca muda o valor do líquido, só quem entrega o IRS ao
    // Estado — por isso a função nem sequer tem esse parâmetro.
    const resultado = calcularCenarioSimulador({
      valorBruto: 1000,
      primeiroAno: false,
      regiao: 'continente',
      categoriaCoeficiente: 0.75,
      taxaSSPerfil: 0.214
    })
    expect(resultado).not.toHaveProperty('retencaoFonte')
  })
})

describe('somarFaturado e somarRecebido', () => {
  it('somarFaturado inclui pendentes; somarRecebido não', () => {
    const recibos = [
      recibo({ valor: 1000, data_pagamento: '2026-08-01', retencao: false }),
      recibo({ valor: 500, data_pagamento: null, retencao: false })
    ]
    expect(somarFaturado(recibos)).toBe(1500)
    expect(somarRecebido(recibos)).toBe(1000)
  })
})
