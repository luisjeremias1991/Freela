import Link from 'next/link'
import Card from '../components/ui/Card'
import PageTitle from '../components/ui/PageTitle'
import { VERSAO_TERMOS_LABEL } from '../../lib/termos'

export const metadata = {
  title: 'Termos de Uso — Freela'
}

export default function Termos() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
      <PageTitle>Termos de Uso</PageTitle>
      <p className="text-sm text-brand-muted italic mb-8">
        Rascunho de trabalho — a rever por um advogado antes de publicar. Última atualização: {VERSAO_TERMOS_LABEL}.
      </p>

      <Card className="flex flex-col gap-6 text-sm text-gray-900 leading-relaxed">
        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">1. O que é a Free Freela</h2>
          <p>
            A Free Freela é uma ferramenta de apoio à gestão de recibos verdes e obrigações fiscais para
            trabalhadores independentes em Portugal. <strong>Não é um serviço de contabilidade, não emite
            documentos fiscais oficiais, e não substitui aconselhamento profissional.</strong>
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">2. Os cálculos dependem inteiramente dos dados que inseres</h2>
          <p className="mb-3">Este é o ponto mais importante destes termos, por isso destacamos:</p>
          <p className="mb-3">
            <strong>
              Todos os valores apresentados pela Free Freela — estimativas de IRS, Segurança Social, IVA,
              valores líquidos, &quot;pôr de lado&quot;, ou qualquer outro cálculo — são gerados exclusivamente
              com base na informação que tu próprio inseres na aplicação
            </strong>{' '}
            (recibos, datas, retenções, regime fiscal, categoria de atividade, e demais dados do Perfil).
          </p>
          <p className="mb-3">
            A Free Freela não verifica, não confirma e não tem forma de saber se os dados inseridos estão
            corretos, completos ou atualizados. Se inserires um valor errado, esquecer um recibo, ou preencheres
            mal o teu regime fiscal, os cálculos resultantes vão refletir esse erro — não é possível à aplicação
            detetar isso.
          </p>
          <p>
            <strong>
              Não nos responsabilizamos por diferenças entre os valores apresentados na aplicação e as tuas
              obrigações fiscais reais
            </strong>
            , sejam elas causadas por dados incorretos, incompletos, desatualizados, ou por alterações na lei
            fiscal não refletidas na aplicação. A aplicação é uma ferramenta de apoio à organização pessoal — a
            responsabilidade pela exatidão da tua situação fiscal é sempre tua, e recomendamos sempre a
            confirmação com um contabilista certificado antes de tomares decisões financeiras ou fiscais com
            base nestes valores.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">3. Simulações e cálculos simplificados</h2>
          <p>
            Os valores do Simulador, do Painel, e de qualquer outra funcionalidade de cálculo são estimativas
            simplificadas, criadas para dar uma ideia geral da tua situação — não são aconselhamento fiscal nem
            uma garantia de valores reais a pagar ou receber.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">4. Conta e responsabilidade pela password</h2>
          <p>
            És responsável por manter a tua password (ou o acesso por Face ID/Touch ID, se ativado) em
            segurança. Notifica-nos se suspeitares de acesso não autorizado à tua conta.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">5. Plano Pro e pagamentos</h2>
          <p>
            A subscrição Free Freela Pro é processada através da Stripe. Podes cancelar a qualquer momento — o
            acesso Pro mantém-se ativo até ao fim do período já pago.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">6. Marketplace de contabilistas</h2>
          <p>
            A Free Freela pode apresentar contabilistas parceiros disponíveis para consulta, com marcação
            através de plataformas externas (ex. Cal.com). A Free Freela não é parte no serviço prestado entre o
            contabilista e o cliente, e não se responsabiliza pela qualidade, exatidão ou resultado desse
            aconselhamento — a relação profissional estabelece-se diretamente entre as duas partes.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">7. Alterações a estes termos</h2>
          <p>
            Podemos atualizar estes termos ocasionalmente. Notificamos alterações significativas por email ou
            dentro da aplicação.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">8. Contacto</h2>
          <p>
            luis.a.jeremias@gmail.com{' '}
            <span className="text-brand-muted italic">
              (temporário — trocar por email de suporte profissional assim que o domínio estiver ativo)
            </span>
          </p>
        </section>
      </Card>

      <p className="text-sm text-brand-muted mt-6 text-center">
        <Link href="/login" className="text-brand-navy font-semibold">Voltar</Link>
      </p>
    </div>
  )
}
