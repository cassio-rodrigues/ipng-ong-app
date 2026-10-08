// Modelos de mensagem de WhatsApp. O texto usa marcadores entre chaves, trocados por pessoa:
// {nome} (primeiro nome), {turma}, {data}, {horario}, {local}.
// Os campos de evento (data/horário/local) são preenchidos uma vez no diálogo de envio.
import { firstName } from "@/lib/whatsapp"

export type TemplateField = "data" | "horario" | "local"

export interface WhatsAppTemplate {
  id: string
  label: string
  /** Campos que o usuário preenche antes de enviar */
  fields: TemplateField[]
  text: string
}

export const FIELD_LABEL: Record<TemplateField, string> = { data: "Data", horario: "Horário", local: "Local" }

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "contato",
    label: "Contato geral",
    fields: [],
    text: "Olá, {nome}! Aqui é do Inglês Para Nossa Gente.",
  },
  {
    id: "boas_vindas",
    label: "Boas-vindas",
    fields: [],
    text:
      "Olá, {nome}! Seja muito bem-vindo(a) ao Inglês Para Nossa Gente! 🎉\n\n" +
      "Sua matrícula na turma {turma} está confirmada. Estamos muito felizes em ter você com a gente.\n\n" +
      "Qualquer dúvida sobre aulas, horários ou material, é só chamar por aqui. Welcome! 👋",
  },
  {
    id: "day_out",
    label: "Convite Day Out",
    fields: ["data", "horario", "local"],
    text:
      "Olá, {nome}! 🌟 Você foi um dos destaques da turma {turma} e queremos te convidar para o nosso Day Out!\n\n" +
      "📅 {data}\n⏰ {horario}\n📍 {local}\n\n" +
      "Vai ser um dia para praticar inglês fora da sala de aula, com muita diversão. Confirma sua presença respondendo esta mensagem? 😊",
  },
  {
    id: "formatura",
    label: "Formatura",
    fields: ["data", "horario", "local"],
    text:
      "Olá, {nome}! 🎓 Chegou a hora de celebrar sua conquista!\n\n" +
      "A formatura da turma {turma} será:\n📅 {data}\n⏰ {horario}\n📍 {local}\n\n" +
      "Sua família e amigos são muito bem-vindos. Confirma sua presença respondendo esta mensagem? Congratulations! 👏",
  },
]

export const TEMPLATE_BY_ID = Object.fromEntries(WHATSAPP_TEMPLATES.map(t => [t.id, t]))

export interface TemplateContext {
  name: string | null | undefined
  className?: string | null
  data?: string
  horario?: string
  local?: string
}

export function renderTemplate(text: string, ctx: TemplateContext): string {
  const values: Record<string, string> = {
    nome: firstName(ctx.name),
    turma: ctx.className ?? "",
    data: ctx.data ?? "",
    horario: ctx.horario ?? "",
    local: ctx.local ?? "",
  }
  // Sem turma, some o trecho inteiro ("na turma {turma}") em vez de sobrar "na turma  está"
  const base = values.turma ? text : text.replace(/ (da|na) turma \{turma\}/g, "")
  return base.replace(/\{(\w+)\}/g, (m, key: string) => key in values ? values[key] : m)
}
