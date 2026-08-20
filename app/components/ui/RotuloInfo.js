import InfoIcon from './InfoIcon'

// Junta o texto de um rótulo ao ícone "i" de explicação, sempre lado a lado
// como dois itens flex, alinhados ao topo — em vez de deixar o ícone fluir
// solto dentro do texto (que era o padrão antigo: "Texto<InfoIcon .../>"
// direto dentro de <label>/<p>/<Label>). Esse padrão antigo fazia o "i"
// saltar de posição consoante o rótulo coubesse numa única linha ou
// quebrasse para uma segunda — com flexbox e items-start, a posição do "i"
// fica sempre a mesma relativamente à primeira linha do rótulo,
// independentemente do comprimento do texto.
export default function RotuloInfo({ children, titulo, texto, className = '' }) {
  return (
    <span className={`inline-flex items-start gap-1 ${className}`}>
      <span>{children}</span>
      <InfoIcon titulo={titulo} texto={texto} />
    </span>
  )
}
