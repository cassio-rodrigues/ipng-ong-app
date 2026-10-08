"use client"

import { useEffect, useState } from "react"
import { highlightsApi, classesApi, studentsApi } from "@/lib/api"
import type { StudentHighlight, Class_, Student } from "@/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Pencil, Plus, PartyPopper } from "lucide-react"
import { WhatsAppSendDialog, type WhatsAppRecipient } from "@/components/shared/WhatsAppSendDialog"
import { Input } from "@/components/ui/input"
import { exportToExcel } from "@/lib/excel"
import { useAuth } from "@/hooks/use-auth"
import { highlightBadgeClass, HIGHLIGHT_LABEL } from "@/lib/highlights"
import { cn } from "@/lib/utils"

const REASONS = [
  { value: "participation_high", label: "Participação ativa em aula" },
  { value: "participation_low", label: "Baixa participação em aula" },
  { value: "evolution_good", label: "Boa evolução no aprendizado do inglês" },
  { value: "evolution_low", label: "Pouca evolução no aprendizado do inglês" },
  { value: "pronunciation_good", label: "Boa pronúncia para o nível" },
  { value: "pronunciation_difficult", label: "Dificuldade de pronúncia para o nível" },
  { value: "listening_good", label: "Boa compreensão auditiva (listening)" },
  { value: "listening_difficult", label: "Dificuldade de compreensão auditiva (listening)" },
  { value: "reading_writing_good", label: "Leitura e escrita adequadas para o nível" },
  { value: "reading_writing_difficult", label: "Dificuldades em leitura e/ou escrita" },
  { value: "interest_high", label: "Demonstra interesse e curiosidade" },
  { value: "interest_low", label: "Pouco interesse ou curiosidade pelo conteúdo" },
  { value: "collaboration_good", label: "Interage bem e colabora com colegas" },
  { value: "collaboration_low", label: "Evita interações ou atividades em grupo" },
  { value: "attendance_good", label: "Boa frequência e pontualidade" },
  { value: "attendance_irregular", label: "Frequência irregular ou atrasos frequentes" },
]

const CHANNELS = [
  { value: "music", label: "Música" },
  { value: "games", label: "Jogos" },
  { value: "videos", label: "Vídeos / YouTube" },
  { value: "school", label: "Escola regular" },
  { value: "conversation", label: "Conversação" },
  { value: "other_course", label: "Outro curso" },
  { value: "unknown", label: "Não sei, nunca perguntei" },
]

const EMPTY = {
  student_id: "", class_id: "",
  title: "",
  highlight_type: "positive",
  description: "",
  student_occupation: "",
  reason_primary: "",
  reason_secondary: "",
  level_assessment: "",
  participation_spontaneous: "",
  class_focus: "",
  interest_beyond_class: "",
  speaks_despite_errors: "",
  curiosity_level: "",
  homework_rate: "",
  english_outside_contact: "",
  english_outside_channels: "",
  self_confidence: "",
  previously_highlighted: "",
  teacher_overall_perception: "",
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">{children}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  )
}

function Sel({ value, onValueChange, placeholder, children }: { value: string; onValueChange: (v: string) => void; placeholder?: string; children: React.ReactNode }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Selecionar"} /></SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}

export default function HighlightsPage() {
  const { canEdit, isTeacher, user, loading: authLoading } = useAuth()
  const canManage = canEdit || isTeacher
  const [highlights, setHighlights] = useState<StudentHighlight[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editHighlight, setEditHighlight] = useState<StudentHighlight | null>(null)
  const [filterClass, setFilterClass] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const classParams = isTeacher && user?.id ? { teacher_id: user.id } : {}
      const [hRes, cRes, sRes] = await Promise.all([
        highlightsApi.list(filterClass !== "all" ? { class_id: filterClass } : {}),
        classesApi.list(classParams),
        studentsApi.list(isTeacher && user?.id ? { teacher_id: user.id } : {}),
      ])
      const teacherClassIds = new Set(cRes.data.map((c: Class_) => c.id))
      const filtered = isTeacher
        ? hRes.data.filter((h: StudentHighlight) => h.class_id && teacherClassIds.has(h.class_id))
        : hRes.data
      setHighlights(filtered); setClasses(cRes.data); setStudents(sRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { if (!authLoading) load() }, [filterClass, authLoading, isTeacher, user?.id])

  function openEdit(h: StudentHighlight) {
    setEditHighlight(h)
    setForm({
      student_id: h.student_id ?? "", class_id: h.class_id ?? "",
      title: h.title ?? "", highlight_type: h.highlight_type ?? "positive",
      description: h.description ?? "",
      student_occupation: h.student_occupation ?? "",
      reason_primary: h.reason_primary ?? "", reason_secondary: h.reason_secondary ?? "",
      level_assessment: h.level_assessment ?? "",
      participation_spontaneous: h.participation_spontaneous ?? "",
      class_focus: h.class_focus ?? "", interest_beyond_class: h.interest_beyond_class ?? "",
      speaks_despite_errors: h.speaks_despite_errors ?? "", curiosity_level: h.curiosity_level ?? "",
      homework_rate: h.homework_rate ?? "", english_outside_contact: h.english_outside_contact ?? "",
      english_outside_channels: h.english_outside_channels ?? "",
      self_confidence: h.self_confidence ?? "", previously_highlighted: h.previously_highlighted ?? "",
      teacher_overall_perception: h.teacher_overall_perception ?? "",
    })
  }

  function toggleChannel(ch: string) {
    const current = form.english_outside_channels.split(",").filter(Boolean)
    const next = current.includes(ch) ? current.filter(x => x !== ch) : [...current, ch]
    setForm(f => ({ ...f, english_outside_channels: next.join(",") }))
  }

  function buildPayload() {
    return {
      ...form,
      class_id: form.class_id || undefined,
      title: form.title || undefined,
      student_occupation: form.student_occupation || undefined,
      reason_primary: form.reason_primary || undefined,
      reason_secondary: form.reason_secondary || undefined,
      level_assessment: form.level_assessment || undefined,
      participation_spontaneous: form.participation_spontaneous || undefined,
      class_focus: form.class_focus || undefined,
      interest_beyond_class: form.interest_beyond_class || undefined,
      speaks_despite_errors: form.speaks_despite_errors || undefined,
      curiosity_level: form.curiosity_level || undefined,
      homework_rate: form.homework_rate || undefined,
      english_outside_contact: form.english_outside_contact || undefined,
      english_outside_channels: form.english_outside_channels || undefined,
      self_confidence: form.self_confidence || undefined,
      previously_highlighted: form.previously_highlighted || undefined,
      teacher_overall_perception: form.teacher_overall_perception || undefined,
      description: form.description || undefined,
    }
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await highlightsApi.create(buildPayload()); setCreateOpen(false); setForm({ ...EMPTY }); await load() }
    finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editHighlight) return; setSaving(true)
    try {
      const { student_id: _, class_id: __, ...rest } = buildPayload()
      await highlightsApi.update(editHighlight.id, rest)
      setEditHighlight(null); await load()
    } finally { setSaving(false) }
  }

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))
  const studentMap = Object.fromEntries(students.map(s => [s.id, s.full_name]))
  const reasonLabel = Object.fromEntries(REASONS.map(r => [r.value, r.label]))
  const studentById = Object.fromEntries(students.map(s => [s.id, s]))

  // Filtros de tipo e período no cliente; datas comparadas no dia local
  const localDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE")
  const visible = highlights.filter(h => {
    if (filterType !== "all" && h.highlight_type !== filterType) return false
    const day = h.created_at ? localDay(h.created_at) : ""
    if (startDate && day < startDate) return false
    if (endDate && day > endDate) return false
    return true
  })
  const visibleSelected = visible.filter(h => selected.has(h.id))
  const allSelected = visible.length > 0 && visibleSelected.length === visible.length

  // Contagem por turma (positivos/negativos) dos destaques filtrados
  const byClass = Object.values(visible.reduce<Record<string, { name: string; positive: number; negative: number; other: number }>>((acc, h) => {
    const key = h.class_id ?? "none"
    const row = acc[key] ??= { name: h.class_id ? classMap[h.class_id] ?? "—" : "Sem turma", positive: 0, negative: 0, other: 0 }
    if (h.highlight_type === "positive") row.positive++
    else if (h.highlight_type === "negative") row.negative++
    else row.other++
    return acc
  }, {})).sort((a, b) => (b.positive + b.negative + b.other) - (a.positive + a.negative + a.other))

  // Convite do Day Out: selecionados, ou todos os destaques positivos filtrados; um por aluno
  const inviteSource = visibleSelected.length ? visibleSelected : visible.filter(h => h.highlight_type === "positive")
  const inviteRecipients: WhatsAppRecipient[] = [...new Map(inviteSource.map(h => {
    const st = studentById[h.student_id]
    return [h.student_id, {
      id: h.student_id, name: st?.full_name ?? null, phone: st?.phone ?? null,
      className: h.class_id ? classMap[h.class_id] ?? null : null,
    }] as const
  })).values()]

  function toggleOne(id: string) {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visible.map(h => h.id)))
  }

  // Exporta a seleção (ou tudo que está filtrado) com contato do aluno — ex.: lista de convite do Day Out
  function handleExport() {
    const rows = visibleSelected.length ? visibleSelected : visible
    exportToExcel(rows.map(h => {
      const st = studentById[h.student_id]
      return {
        "Aluno": st?.full_name ?? "",
        "Turma": h.class_id ? classMap[h.class_id] ?? "" : "",
        "WhatsApp": st?.phone ?? "",
        "Email": st?.email ?? "",
        "Tipo": HIGHLIGHT_LABEL[h.highlight_type ?? ""] ?? h.highlight_type ?? "",
        "Motivo principal": h.reason_primary ? reasonLabel[h.reason_primary] ?? h.reason_primary : "",
        "Percepção geral": h.teacher_overall_perception ?? "",
        "Data": h.created_at ? new Date(h.created_at).toLocaleDateString("pt-BR") : "",
      }
    }), `destaques_${new Date().toISOString().slice(0, 10)}`)
  }
  const selectedChannels = form.english_outside_channels.split(",").filter(Boolean)
  const studentOptions = students.map(s => ({ value: s.id, label: s.full_name ?? s.id }))

  const formBody = (isEdit = false) => (
    <div className="overflow-y-auto max-h-[70vh] pr-1 space-y-4 mt-2">
      {/* Aluno / turma */}
      {!isEdit && (
        <>
          <Field label="Aluno *">
            <Combobox
              options={studentOptions}
              value={form.student_id}
              onValueChange={v => F("student_id", v)}
              placeholder="Buscar aluno pelo nome…"
              emptyText="Nenhum aluno encontrado"
            />
          </Field>
          <Field label="Turma (opcional)">
            <Sel value={form.class_id} onValueChange={v => F("class_id", v)}>
              <SelectItem value="">—</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </Sel>
          </Field>
        </>
      )}

      {/* Seção 2 */}
      <SectionTitle>2. Situação do aluno</SectionTitle>
      <Field label="Além do curso de inglês, o aluno:">
        <Sel value={form.student_occupation} onValueChange={v => F("student_occupation", v)}>
          <SelectItem value="studies_only">Apenas estuda</SelectItem>
          <SelectItem value="works_only">Apenas trabalha</SelectItem>
          <SelectItem value="works_and_studies">Trabalha e estuda</SelectItem>
        </Sel>
      </Field>

      {/* Seção 3 */}
      <SectionTitle>3. Tipo de destaque</SectionTitle>
      <Field label="Este aluno está sendo destacado como:">
        <Sel value={form.highlight_type} onValueChange={v => F("highlight_type", v)}>
          <SelectItem value="positive">Destaque POSITIVO</SelectItem>
          <SelectItem value="negative">Destaque NEGATIVO</SelectItem>
        </Sel>
      </Field>

      {/* Seção 4 */}
      <SectionTitle>4. Motivo do destaque</SectionTitle>
      <Field label="Motivo principal">
        <Sel value={form.reason_primary} onValueChange={v => F("reason_primary", v)}>
          {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </Sel>
      </Field>
      <Field label="Motivo secundário">
        <Sel value={form.reason_secondary} onValueChange={v => F("reason_secondary", v)}>
          <SelectItem value="">—</SelectItem>
          {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </Sel>
      </Field>

      {/* Seção 5 */}
      <SectionTitle>5. Desempenho em relação ao nível atual</SectionTitle>
      <Field label="Ao iniciar o nível, o aluno já demonstrava conhecimentos:">
        <Sel value={form.level_assessment} onValueChange={v => F("level_assessment", v)}>
          <SelectItem value="well_above">Bem acima do nível esperado</SelectItem>
          <SelectItem value="slightly_above">Um pouco acima do nível esperado</SelectItem>
          <SelectItem value="as_expected">Dentro do nível esperado</SelectItem>
          <SelectItem value="slightly_below">Um pouco abaixo do nível esperado</SelectItem>
          <SelectItem value="well_below">Bem abaixo do nível esperado</SelectItem>
          <SelectItem value="cannot_assess">Não sei avaliar</SelectItem>
        </Sel>
      </Field>

      {/* Seção 6 */}
      <SectionTitle>6. Participação e comportamento em sala</SectionTitle>
      <Field label="O aluno participa espontaneamente das atividades?">
        <Sel value={form.participation_spontaneous} onValueChange={v => F("participation_spontaneous", v)}>
          <SelectItem value="always">Sempre</SelectItem>
          <SelectItem value="frequently">Frequentemente</SelectItem>
          <SelectItem value="sometimes">Às vezes</SelectItem>
          <SelectItem value="rarely">Raramente</SelectItem>
        </Sel>
      </Field>
      <Field label="O aluno mantém foco durante a aula?">
        <Sel value={form.class_focus} onValueChange={v => F("class_focus", v)}>
          <SelectItem value="high">Alto</SelectItem>
          <SelectItem value="medium">Médio</SelectItem>
          <SelectItem value="low">Baixo</SelectItem>
        </Sel>
      </Field>
      <Field label="O aluno demonstra interesse mesmo fora das atividades obrigatórias?">
        <Sel value={form.interest_beyond_class} onValueChange={v => F("interest_beyond_class", v)}>
          <SelectItem value="very_high">Muito alto</SelectItem>
          <SelectItem value="high">Alto</SelectItem>
          <SelectItem value="medium">Médio</SelectItem>
          <SelectItem value="low">Baixo</SelectItem>
          <SelectItem value="very_low">Muito baixo</SelectItem>
          <SelectItem value="unknown">Não sei</SelectItem>
        </Sel>
      </Field>

      {/* Seção 7 */}
      <SectionTitle>7. Atitude diante do aprendizado</SectionTitle>
      <Field label="O aluno tenta falar inglês mesmo com medo de errar?">
        <Sel value={form.speaks_despite_errors} onValueChange={v => F("speaks_despite_errors", v)}>
          <SelectItem value="always">Sempre</SelectItem>
          <SelectItem value="frequently">Frequentemente</SelectItem>
          <SelectItem value="sometimes">Às vezes</SelectItem>
          <SelectItem value="never">Nunca</SelectItem>
        </Sel>
      </Field>
      <Field label="O aluno demonstra curiosidade (faz perguntas, busca aprender mais)?">
        <Sel value={form.curiosity_level} onValueChange={v => F("curiosity_level", v)}>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
        </Sel>
      </Field>
      <Field label="Quando há tarefas para casa, o aluno costuma realizá-las?">
        <Sel value={form.homework_rate} onValueChange={v => F("homework_rate", v)}>
          <SelectItem value="always">Sempre (90–100%)</SelectItem>
          <SelectItem value="mostly">Na maioria das vezes (70–89%)</SelectItem>
          <SelectItem value="sometimes">Às vezes (30–69%)</SelectItem>
          <SelectItem value="rarely">Raramente (0–29%)</SelectItem>
        </Sel>
      </Field>

      {/* Seção 8 */}
      <SectionTitle>8. Contato com inglês fora das aulas</SectionTitle>
      <Field label="O aluno parece ter contato com inglês fora da ONG?">
        <Sel value={form.english_outside_contact} onValueChange={v => F("english_outside_contact", v)}>
          <SelectItem value="very_frequent">Contato muito frequente / intenso</SelectItem>
          <SelectItem value="frequent">Contato frequente</SelectItem>
          <SelectItem value="moderate">Contato moderado</SelectItem>
          <SelectItem value="low">Contato baixo</SelectItem>
          <SelectItem value="almost_none">Praticamente nenhum contato</SelectItem>
          <SelectItem value="unknown">Não sei / nunca perguntei</SelectItem>
        </Sel>
      </Field>
      <Field label="Se sim, esse contato parece ser por meio de: (selecione os que se aplicam)">
        <div className="flex flex-wrap gap-2 pt-1">
          {CHANNELS.map(ch => (
            <button
              key={ch.value}
              type="button"
              onClick={() => toggleChannel(ch.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs border transition-colors",
                selectedChannels.includes(ch.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input text-muted-foreground hover:border-primary"
              )}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Seção 9 */}
      <SectionTitle>9. Outros aspectos</SectionTitle>
      <Field label="O aluno demonstra confiança ao usar o inglês?">
        <Sel value={form.self_confidence} onValueChange={v => F("self_confidence", v)}>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
        </Sel>
      </Field>
      <Field label="Este aluno já foi destacado nos Books anteriores?">
        <Sel value={form.previously_highlighted} onValueChange={v => F("previously_highlighted", v)}>
          <SelectItem value="yes">Sim</SelectItem>
          <SelectItem value="no">Não</SelectItem>
          <SelectItem value="unknown">Não sei / não lembro</SelectItem>
        </Sel>
      </Field>

      {/* Seção 10 */}
      <SectionTitle>10. Percepção geral do professor</SectionTitle>
      <Field label="Na sua percepção, este aluno:">
        <Sel value={form.teacher_overall_perception} onValueChange={v => F("teacher_overall_perception", v)}>
          <SelectItem value="above_high_potential">Desempenho acima do esperado, com alto potencial de crescimento</SelectItem>
          <SelectItem value="good_potential">Bom potencial, responde bem a estímulos e acompanhamento</SelectItem>
          <SelectItem value="as_expected">Desenvolvimento dentro do esperado para o nível</SelectItem>
          <SelectItem value="below_needs_support">Abaixo do esperado, necessita reforço pedagógico</SelectItem>
          <SelectItem value="well_below_continuous">Bem abaixo do esperado, com dificuldades contínuas</SelectItem>
          <SelectItem value="cannot_assess">Não é possível avaliar neste momento</SelectItem>
        </Sel>
      </Field>
      <Field label="Comentários adicionais">
        <textarea
          value={form.description}
          onChange={e => F("description", e.target.value)}
          rows={3}
          placeholder="Observações complementares sobre o aluno…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </Field>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Destaques de Alunos</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          {canManage && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Novo destaque</Button></DialogTrigger>}
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Registrar destaque</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}>
              {formBody(false)}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || !form.student_id}>{saving ? "Salvando…" : "Registrar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editHighlight} onOpenChange={o => !o && setEditHighlight(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Editar destaque — {editHighlight ? studentMap[editHighlight.student_id] : ""}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formBody(true)}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditHighlight(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar por turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="positive">Positivos</SelectItem>
            <SelectItem value="negative">Negativos</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>De</span>
          <Input type="date" className="w-40" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span>até</span>
          <Input type="date" className="w-40" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setInviteOpen(true)} disabled={inviteRecipients.length === 0}
          title={visibleSelected.length ? "Convidar os selecionados" : "Convidar todos os destaques positivos da lista"}>
          <PartyPopper className="size-4 mr-2" />Convidar para o Day Out ({inviteRecipients.length})
        </Button>
        <WhatsAppSendDialog open={inviteOpen} onOpenChange={setInviteOpen} recipients={inviteRecipients}
          defaultTemplate="day_out" title="Convite para o Day Out" />
        <Button variant="outline" size="sm" onClick={handleExport} disabled={visible.length === 0}>
          <Download className="size-4 mr-2" />
          {visibleSelected.length ? `Exportar ${visibleSelected.length} selecionado(s)` : `Exportar ${visible.length}`}
        </Button>
      </div>

      {!loading && byClass.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {byClass.map(c => (
            <div key={c.name} className="rounded-md border bg-card px-3 py-1.5 text-xs">
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-green-600 dark:text-green-400">{c.positive} positivo(s)</span>
              <span className="ml-2 text-red-600 dark:text-red-400">{c.negative} negativo(s)</span>
              {c.other > 0 && <span className="ml-2 text-muted-foreground">{c.other} outro(s)</span>}
            </div>
          ))}
        </div>
      )}

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 cursor-pointer" aria-label="Selecionar todos"
                    checked={allSelected} onChange={toggleAll} />
                </TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo principal</TableHead>
                <TableHead>Percepção geral</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(h => (
                <TableRow key={h.id} className={selected.has(h.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 cursor-pointer" aria-label="Selecionar"
                      checked={selected.has(h.id)} onChange={() => toggleOne(h.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{studentMap[h.student_id] ?? "—"}</TableCell>
                  <TableCell>{h.class_id ? classMap[h.class_id] ?? "—" : "—"}</TableCell>
                  <TableCell>
                    <Badge className={highlightBadgeClass(h.highlight_type)}>
                      {HIGHLIGHT_LABEL[h.highlight_type ?? ""] ?? h.highlight_type ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                    {h.reason_primary ? reasonLabel[h.reason_primary] ?? h.reason_primary : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-36 truncate">
                    {h.teacher_overall_perception ?? "—"}
                  </TableCell>
                  <TableCell>{h.created_at ? new Date(h.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>{canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(h)}><Pencil className="size-4" /></Button>}</TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum destaque registrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
