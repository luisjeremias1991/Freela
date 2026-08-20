import Link from 'next/link'
import Card from '../components/ui/Card'
import PageTitle from '../components/ui/PageTitle'

export const metadata = {
  title: 'Política de Privacidade — Recibos Claros'
}

export default function Privacidade() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
      <PageTitle>Política de Privacidade</PageTitle>
      <p className="text-sm text-brand-muted italic mb-8">
        Rascunho de trabalho — a rever por um advogado antes de publicar. Última atualização: 18 de agosto de 2026.
      </p>

      <Card className="flex flex-col gap-6 text-sm text-gray-900 leading-relaxed">
        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">1. Quem trata os teus dados</h2>
          <p className="mb-3">
            A Recibos Claros é responsável pelo tratamento dos dados pessoais recolhidos através desta aplicação.
          </p>
          <p>Contacto: suporte@recibosclaros.pt</p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">2. Que dados recolhemos</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Dados de conta</strong>: email, palavra-passe (encriptada, nunca vemos o valor real)</li>
            <li>
              <strong>Dados de perfil</strong>: nome, NIF, data de início de atividade, categoria de atividade,
              regime de IVA, taxa de Segurança Social
            </li>
            <li>
              <strong>Dados de faturação que introduzes</strong>: recibos (cliente, NIF do cliente, valor, data,
              estado de pagamento), despesas
            </li>
            <li>
              <strong>Dados de pagamento</strong>: geridos diretamente pela Stripe — a Recibos Claros nunca vê nem
              guarda o número do teu cartão
            </li>
            <li>
              <strong>Dados técnicos básicos</strong>: quando ativarmos analytics (ainda não ativo), dados de
              utilização anónimos
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">3. Para que usamos estes dados</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Fazer funcionar a aplicação (mostrar os teus recibos, calcular estimativas fiscais)</li>
            <li>Processar a tua subscrição Recibos Claros Pro, através da Stripe</li>
            <li>Enviar-te lembretes de prazos fiscais, se tiveres essa funcionalidade ativa</li>
            <li>Melhorar o produto (de forma agregada, não individual)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">4. Com quem partilhamos dados</h2>
          <p className="mb-3">
            Usamos os seguintes prestadores de serviços, que têm acesso técnico aos dados apenas para o
            funcionamento da app:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            <li><strong>Supabase</strong> — armazenamento da base de dados</li>
            <li><strong>Stripe</strong> — processamento de pagamentos</li>
            <li><strong>Resend</strong> — envio de emails de lembrete</li>
          </ul>
          <p>Não vendemos nem partilhamos os teus dados com terceiros para fins de marketing.</p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">5. Quanto tempo guardamos os dados</h2>
          <p>
            Guardamos os teus dados enquanto a tua conta estiver ativa. Se apagares a conta, os dados são
            eliminados no prazo de 30 dias, exceto quando a lei nos obrigar a guardar registos de faturação por
            mais tempo.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">6. Os teus direitos</h2>
          <p className="mb-3">Tens direito a:</p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            <li>Aceder aos dados que temos sobre ti</li>
            <li>Corrigir dados incorretos</li>
            <li>Pedir a eliminação da tua conta e dados</li>
            <li>Exportar os teus dados (ex. via a funcionalidade de exportação CSV)</li>
            <li>Retirar consentimento a qualquer momento</li>
          </ul>
          <p>Para exerceres qualquer um destes direitos, contacta-nos em suporte@recibosclaros.pt.</p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">7. Segurança</h2>
          <p>
            Os dados são protegidos por regras de acesso (Row Level Security) que garantem que só tu consegues
            aceder aos teus próprios dados, mesmo ao nível da base de dados.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base text-gray-900 mb-2">8. Alterações a esta política</h2>
          <p>
            Podemos atualizar esta política ocasionalmente. Notificamos alterações significativas por email ou
            dentro da aplicação.
          </p>
        </section>
      </Card>

      <p className="text-sm text-brand-muted mt-6 text-center">
        <Link href="/login" className="text-brand-primary font-semibold">Voltar</Link>
      </p>
    </div>
  )
}
