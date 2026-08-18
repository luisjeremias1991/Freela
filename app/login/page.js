'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'

// Tradução por código de erro (error.code) — cobre todos os códigos conhecidos
// do SDK de autenticação da Supabase (auth-js), para não depender do texto em inglês.
const MENSAGENS_POR_CODIGO = {
  // Conta / dados
  email_exists: 'Já existe uma conta com este email. Tenta entrar em vez de criar conta.',
  phone_exists: 'Já existe uma conta com este número de telefone.',
  user_already_exists: 'Já existe uma conta com este email. Tenta entrar em vez de criar conta.',
  identity_already_exists: 'Já existe uma conta com este email. Tenta entrar em vez de criar conta.',
  single_identity_not_deletable: 'Não é possível remover o único método de login desta conta.',
  email_conflict_identity_not_deletable: 'Não é possível remover este método de login sem entrar em conflito com outra conta.',
  user_not_found: 'Não encontrámos nenhuma conta com estes dados.',
  identity_not_found: 'Não encontrámos nenhuma conta com estes dados.',
  invalid_credentials: 'Email ou palavra-passe incorretos.',
  weak_password: 'A palavra-passe é demasiado fraca. Usa pelo menos 6 caracteres.',
  same_password: 'A nova palavra-passe tem de ser diferente da atual.',
  email_address_invalid: 'Introduz um email válido.',
  email_address_not_authorized: 'Este email não está autorizado a criar conta.',
  validation_failed: 'Os dados introduzidos não são válidos.',
  bad_json: 'Os dados introduzidos não são válidos.',
  user_banned: 'Esta conta foi suspensa. Contacta o suporte.',
  user_sso_managed: 'Esta conta é gerida por outro fornecedor de login.',

  // Confirmação de email/telefone
  email_not_confirmed: 'Confirma o teu email antes de entrares — verifica a caixa de entrada.',
  phone_not_confirmed: 'Confirma o teu número de telefone antes de continuares.',
  provider_email_needs_verification: 'Precisas de confirmar o email associado a este método de login.',

  // Sessão
  bad_jwt: 'A tua sessão é inválida. Inicia sessão novamente.',
  session_not_found: 'A tua sessão expirou. Inicia sessão novamente.',
  session_expired: 'A tua sessão expirou. Inicia sessão novamente.',
  refresh_token_not_found: 'A tua sessão expirou. Inicia sessão novamente.',
  refresh_token_already_used: 'A tua sessão expirou. Inicia sessão novamente.',
  reauthentication_needed: 'Precisas de voltar a autenticar-te para continuar.',
  reauthentication_not_valid: 'Não foi possível confirmar a tua identidade. Tenta novamente.',
  reauth_nonce_missing: 'Não foi possível confirmar a tua identidade. Tenta novamente.',
  insufficient_aal: 'É necessária verificação adicional para continuares.',

  // Permissões
  not_admin: 'Não tens permissões para esta ação.',
  no_authorization: 'Não tens autorização para esta ação.',

  // Pedidos/fluxos expirados
  flow_state_not_found: 'O pedido expirou. Tenta novamente.',
  flow_state_expired: 'O pedido expirou. Tenta novamente.',
  otp_expired: 'O código expirou. Pede um novo.',
  invite_not_found: 'Este convite não é válido ou já expirou.',
  bad_code_verifier: 'O pedido expirou ou é inválido. Tenta novamente.',
  request_timeout: 'O pedido demorou demasiado tempo. Tenta novamente.',

  // Limites e segurança
  over_request_rate_limit: 'Foram feitas demasiadas tentativas em pouco tempo. Espera um pouco antes de tentares outra vez.',
  over_email_send_rate_limit: 'Foram feitas demasiadas tentativas em pouco tempo. Espera um pouco antes de tentares outra vez.',
  over_sms_send_rate_limit: 'Foram feitas demasiadas tentativas em pouco tempo. Espera um pouco antes de tentares outra vez.',
  captcha_failed: 'A verificação de segurança falhou. Tenta novamente.',
  mfa_ip_address_mismatch: 'Não foi possível confirmar a tua identidade. Tenta novamente.',

  // Registo/login desativados ou não suportados
  signup_disabled: 'De momento não é possível criar novas contas.',
  email_provider_disabled: 'O registo por email está desativado.',
  phone_provider_disabled: 'O registo por telefone está desativado.',
  provider_disabled: 'Este método de login está desativado.',
  anonymous_provider_disabled: 'Este tipo de acesso está desativado.',
  manual_linking_disabled: 'Não é possível associar contas manualmente.',
  otp_disabled: 'Login por código está desativado.',

  // Autenticação multifator (MFA)
  too_many_enrolled_mfa_factors: 'Atingiste o limite de métodos de autenticação.',
  mfa_factor_name_conflict: 'Já existe um método de autenticação com este nome.',
  mfa_factor_not_found: 'Método de autenticação não encontrado.',
  mfa_challenge_expired: 'O código expirou. Tenta novamente.',
  mfa_verification_failed: 'Código de verificação inválido.',
  mfa_verification_rejected: 'Verificação rejeitada.',
  mfa_verified_factor_exists: 'Este método de autenticação já está confirmado.',
  mfa_phone_enroll_not_enabled: 'A autenticação por telefone não está disponível.',
  mfa_phone_verify_not_enabled: 'A autenticação por telefone não está disponível.',
  mfa_totp_enroll_not_enabled: 'A autenticação por aplicação não está disponível.',
  mfa_totp_verify_not_enabled: 'A autenticação por aplicação não está disponível.',
  mfa_webauthn_enroll_not_enabled: 'A autenticação por chave de segurança não está disponível.',
  mfa_webauthn_verify_not_enabled: 'A autenticação por chave de segurança não está disponível.',

  // OAuth / SSO / SAML
  bad_oauth_state: 'Ocorreu um erro no login com este fornecedor. Tenta novamente.',
  bad_oauth_callback: 'Ocorreu um erro no login com este fornecedor. Tenta novamente.',
  oauth_provider_not_supported: 'Este fornecedor de login não é suportado.',
  unexpected_audience: 'Ocorreu um erro no login com este fornecedor. Tenta novamente.',
  sso_provider_not_found: 'Fornecedor de login único não encontrado.',
  saml_provider_disabled: 'O login por SAML está desativado.',
  saml_metadata_fetch_failed: 'Não foi possível obter os dados do fornecedor de login. Tenta novamente.',
  saml_idp_already_exists: 'Este fornecedor de identidade já está configurado.',
  saml_idp_not_found: 'Fornecedor de identidade não encontrado.',
  saml_assertion_no_user_id: 'O fornecedor de login não devolveu os dados necessários.',
  saml_assertion_no_email: 'O fornecedor de login não devolveu um email.',
  saml_relay_state_not_found: 'O pedido expirou. Tenta novamente.',
  saml_relay_state_expired: 'O pedido expirou. Tenta novamente.',
  saml_entity_id_mismatch: 'Ocorreu um erro no login com este fornecedor. Tenta novamente.',
  sso_domain_already_exists: 'Este domínio já está associado a outro fornecedor de login.',

  // Envio de SMS
  sms_send_failed: 'Não foi possível enviar o SMS. Tenta novamente.',

  // Conflitos e erros de servidor
  conflict: 'Já existe um registo com estes dados.',
  unexpected_failure: 'Ocorreu um erro inesperado. Tenta novamente.',
  hook_timeout: 'O servidor demorou demasiado tempo a responder. Tenta novamente.',
  hook_timeout_after_retry: 'O servidor demorou demasiado tempo a responder. Tenta novamente.',
  hook_payload_over_size_limit: 'Ocorreu um erro no servidor. Tenta novamente.',
  hook_payload_invalid_content_type: 'Ocorreu um erro no servidor. Tenta novamente.'
}

// Tradução por padrões no texto (para erros sem "code", ex. erros de base de dados
// que chegam através de triggers/Postgres e não são codificados pelo SDK).
const PADROES_MENSAGEM = [
  { padrao: /duplicate key value|already registered|already exists/, texto: 'Já existe uma conta com este email. Tenta entrar em vez de criar conta.' },
  { padrao: /rate limit/, texto: 'Foram feitas demasiadas tentativas em pouco tempo. Espera um pouco antes de tentares outra vez.' },
  { padrao: /missing email or phone/, texto: 'Preenche o email e a palavra-passe.' },
  { padrao: /database error saving new user/, texto: 'Não foi possível criar a conta. Tenta novamente dentro de alguns minutos.' },
  { padrao: /invalid login credentials/, texto: 'Email ou palavra-passe incorretos.' },
  { padrao: /password should be/, texto: 'A palavra-passe é demasiado fraca. Usa pelo menos 6 caracteres.' },
  { padrao: /unable to validate email/, texto: 'Introduz um email válido.' },
  { padrao: /email not confirmed/, texto: 'Confirma o teu email antes de entrares — verifica a caixa de entrada.' },
  { padrao: /network|fetch failed|failed to fetch/, texto: 'Não foi possível ligar ao servidor. Verifica a tua ligação à internet.' }
]

function traduzirErroAuth(error) {
  const codigo = error.code || ''
  if (MENSAGENS_POR_CODIGO[codigo]) {
    return MENSAGENS_POR_CODIGO[codigo]
  }

  const mensagem = (error.message || '').toLowerCase()
  const padraoCorrespondente = PADROES_MENSAGEM.find((item) => item.padrao.test(mensagem))
  if (padraoCorrespondente) {
    return padraoCorrespondente.texto
  }

  return 'Ocorreu um erro. Tenta novamente.'
}

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMensagem(traduzirErroAuth(error))
    } else {
      setMensagem('Sessão iniciada com sucesso!')
      router.replace('/painel')
    }
  }

  async function criarConta() {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMensagem(traduzirErroAuth(error))
    } else {
      setMensagem('Conta criada! Verifica o teu email para confirmar.')
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-24">
      <PageTitle>Entrar</PageTitle>

      <Card className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="Palavra-passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex gap-2.5">
          <Button className="flex-1" onClick={entrar}>Entrar</Button>
          <Button variant="secondary" className="flex-1" onClick={criarConta}>Criar conta</Button>
        </div>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mt-4">{mensagem}</p>}
    </div>
  )
}