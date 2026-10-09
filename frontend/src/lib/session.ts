// Onde fica a sessão no navegador. Por padrão em sessionStorage: some ao fechar o navegador,
// o que protege computadores compartilhados (comum na ONG). "Manter conectado" usa localStorage.
const KEYS = ["access_token", "refresh_token", "user"] as const
type SessionKey = (typeof KEYS)[number]

function stores(): Storage[] {
  return typeof window === "undefined" ? [] : [window.sessionStorage, window.localStorage]
}

export function getSession(key: SessionKey): string | null {
  for (const s of stores()) {
    const v = s.getItem(key)
    if (v !== null) return v
  }
  return null
}

export function saveSession(values: Partial<Record<SessionKey, string>>, remember: boolean) {
  clearSession()
  const target = remember ? window.localStorage : window.sessionStorage
  for (const [k, v] of Object.entries(values)) if (v != null) target.setItem(k, v)
}

/** Atualiza valores mantendo a sessão onde ela já está */
export function updateSession(values: Partial<Record<SessionKey, string>>) {
  const target = stores().find(s => s.getItem("access_token") !== null) ?? window.sessionStorage
  for (const [k, v] of Object.entries(values)) if (v != null) target.setItem(k, v)
}

export function clearSession() {
  for (const s of stores()) for (const k of KEYS) s.removeItem(k)
}
