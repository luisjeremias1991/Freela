// Pequeno helper partilhado entre Login e Perfil para o suporte a passkeys
// (Face ID / Touch ID). O WebAuthn não permite perguntar ao browser "este
// dispositivo tem uma chave de acesso guardada para esta conta?" sem lançar
// logo o ecrã nativo — por privacidade, é uma decisão do próprio browser/SO.
// Por isso guardamos localmente (neste dispositivo) o ID da passkey devolvido
// pela Supabase assim que o registo é bem sucedido, e usamos essa marca para
// decidir se mostramos "Entrar com Face ID" no Login e o estado no Perfil.
const CHAVE_PASSKEY_ID = 'freela-passkey-id'

export function suportaPasskey() {
  return !!(
    typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    window.PublicKeyCredential &&
    typeof navigator !== 'undefined' &&
    'credentials' in navigator &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  )
}

export function obterPasskeyGuardada() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CHAVE_PASSKEY_ID)
}

export function guardarPasskey(id) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CHAVE_PASSKEY_ID, id)
}

export function limparPasskeyGuardada() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CHAVE_PASSKEY_ID)
}
