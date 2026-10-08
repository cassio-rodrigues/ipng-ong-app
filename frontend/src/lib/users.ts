import type { User } from "@/types"

// Quem pode ser escolhido como professor de turma: perfil Professor, Coordenador
// ou qualquer usuário com "Professor" nos perfis adicionais (ex.: admin que também dá aula).
// Só define quem aparece na lista — permissões continuam vindo do perfil principal (role).
export function canTeach(u: User): boolean {
  return u.role === "teacher" || u.role === "coordinator" || (u.atribuicoes ?? []).includes("teacher")
}

// Conta como volunteacher nas estatísticas: perfil Professor ou "Professor" nos perfis adicionais
export function isVolunteacher(u: User): boolean {
  return u.role === "teacher" || (u.atribuicoes ?? []).includes("teacher")
}
