import Link from "next/link"

// Rascunho da política de privacidade. Trechos entre [colchetes] precisam ser preenchidos
// pela ONG e o texto deve ser revisado por alguém da área jurídica antes de valer.
// Ao mudar o conteúdo, atualize TERMS_VERSION no backend (app/core/config.py) e a data abaixo.
const VERSION = "2026-10"
const UPDATED = "outubro de 2026"

export const metadata = { title: "Política de privacidade — Inglês Para Nossa Gente" }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <Link href="/login" className="text-sm text-primary hover:underline">← Voltar</Link>
        <h1 className="text-2xl font-bold">Política de privacidade</h1>
        <p className="text-sm text-muted-foreground">Versão {VERSION} · atualizada em {UPDATED}</p>
      </header>

      <Section title="1. Quem cuida dos seus dados">
        <p>
          Este sistema é usado pelo projeto <strong>Inglês Para Nossa Gente</strong>, mantido por
          [razão social da ONG], CNPJ [número], com sede em [endereço], que é a <em>controladora</em> dos
          dados pessoais tratados aqui, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
        </p>
        <p>
          Encarregado(a) pelo tratamento de dados (DPO): [nome], contato: [email] — é com essa pessoa
          que você fala sobre qualquer assunto desta política.
        </p>
      </Section>

      <Section title="2. Quais dados coletamos">
        <p><strong>De alunos:</strong> nome, data de nascimento, sexo, endereço, RG, CPF, escolaridade,
          email, WhatsApp, unidade e turma; para menores de idade, nome, RG e CPF do responsável.</p>
        <p><strong>Durante o curso:</strong> frequência, entrega de dever de casa, notas, atividades,
          observações pedagógicas (destaques), acompanhamentos da coordenação e empréstimos de livros.</p>
        <p><strong>De voluntários e equipe:</strong> nome, email, telefone, data de nascimento, sexo e função.</p>
        <p><strong>Registros de uso:</strong> quem criou, alterou ou excluiu cada informação e quando.</p>
      </Section>

      <Section title="3. Para que usamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Organizar matrículas, turmas, aulas e o empréstimo de livros;</li>
          <li>Acompanhar a frequência e o aprendizado, e agir quando um aluno corre risco de evasão;</li>
          <li>Falar com alunos e responsáveis sobre aulas, eventos, formaturas e aniversários;</li>
          <li>Produzir relatórios internos e indicadores do projeto, sempre que possível sem identificar pessoas;</li>
          <li>Cumprir obrigações legais e prestar contas a parceiros e apoiadores, sem expor dados individuais.</li>
        </ul>
        <p>Não vendemos dados e não os usamos para publicidade.</p>
      </Section>

      <Section title="4. Base legal e crianças e adolescentes">
        <p>
          Tratamos os dados com base no <strong>consentimento</strong> do aluno ou, se ele for menor de 18 anos,
          de um dos pais ou do responsável legal (LGPD art. 7º, I, e art. 14), e na execução das atividades
          educacionais oferecidas (art. 7º, V). O sistema registra a data, a versão deste termo e quem deu o
          consentimento.
        </p>
        <p>
          O uso de <strong>imagem</strong> (fotos e vídeos) depende de autorização separada, que pode ser
          recusada sem prejuízo da participação nas aulas.
        </p>
      </Section>

      <Section title="5. Quem tem acesso">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Coordenação e administração:</strong> acesso ao cadastro completo, para gestão do projeto;</li>
          <li><strong>Professores voluntários:</strong> apenas os alunos das próprias turmas, sem documentos (RG, CPF) nem endereço;</li>
          <li><strong>WhatsApp:</strong> quando a equipe envia uma mensagem, o número é aberto no aplicativo do WhatsApp
            (Meta), que segue a própria política de privacidade;</li>
          <li><strong>Hospedagem:</strong> os dados ficam em servidor contratado de [provedor, ex.: Hostinger], localizado em [país].</li>
        </ul>
      </Section>

      <Section title="6. Como protegemos">
        <p>
          Conexão criptografada (HTTPS), senhas guardadas de forma irreversível, acesso por perfil com
          o mínimo necessário, registro de auditoria de todas as alterações e cópias de segurança
          [frequência e forma de guarda dos backups].
        </p>
      </Section>

      <Section title="7. Por quanto tempo guardamos">
        <p>
          Enquanto o aluno participar do projeto e por mais [prazo, ex.: 5 anos] após o desligamento, para
          histórico e prestação de contas. Depois disso, os dados são excluídos ou anonimizados. Você pode
          pedir a exclusão antes, salvo quando a lei exigir a guarda.
        </p>
      </Section>

      <Section title="8. Seus direitos">
        <p>A qualquer momento, você (ou o responsável, no caso de menores) pode pedir:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>confirmação de que tratamos seus dados e uma cópia deles;</li>
          <li>correção de dados incompletos ou errados;</li>
          <li>exclusão dos dados ou retirada do consentimento;</li>
          <li>informação sobre com quem os dados foram compartilhados.</li>
        </ul>
        <p>
          Faça o pedido pelo [email/WhatsApp do encarregado]. Respondemos em até [15] dias. Se não ficar
          satisfeito, você pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </Section>

      <Section title="9. Mudanças nesta política">
        <p>
          Se esta política mudar, a nova versão será publicada aqui e, quando a mudança afetar o
          consentimento, pediremos um novo aceite.
        </p>
      </Section>
    </main>
  )
}
