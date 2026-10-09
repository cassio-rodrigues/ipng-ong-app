# IPNG — Sistema de Gestão Educacional

Sistema web para gestão da ONG **Inglês Para Nossa Gente**, cobrindo unidades, turmas, professores, alunos, aulas, avaliações, atividades e calendário institucional.

---

## Tecnologias

### Backend
| Tecnologia | Versão | Função |
|---|---|---|
| Python | 3.12 | Linguagem principal |
| FastAPI | latest | Framework HTTP / REST API |
| SQLAlchemy | 2.0 | ORM async |
| Alembic | latest | Migrations de banco de dados |
| Pydantic v2 | latest | Validação e serialização |
| asyncpg | latest | Driver PostgreSQL async |
| passlib + bcrypt | latest | Hash de senhas |
| python-jose | latest | JWT (autenticação) |
| PostgreSQL | 16 | Banco de dados relacional |

### Frontend
| Tecnologia | Versão | Função |
|---|---|---|
| Next.js | 16.2.9 | Framework React (App Router) |
| React | 19.2.4 | UI |
| TypeScript | latest | Tipagem estática |
| Tailwind CSS | v4 | Estilização |
| shadcn/ui | latest | Componentes de UI |
| Axios | latest | Requisições HTTP |
| Sonner | latest | Notificações toast |
| Lucide React | latest | Ícones |

### Infraestrutura
| Tecnologia | Função |
|---|---|
| Docker + Docker Compose | Containerização de todos os serviços |
| Nginx | Reverse proxy, SSL termination, redirect HTTP→HTTPS |
| Certbot (Let's Encrypt) | Certificado SSL gratuito com renovação automática |

---

## Arquitetura

```
Internet
    │
    ▼
 Nginx (80/443)
    │
    ├── gestao.inglesparanossagente.org ──────► Frontend (Next.js :3000)
    │                                                      │
    └── api.gestao.inglesparanossagente.org ──► Backend  (FastAPI :8000)
                                            │
                                       PostgreSQL (:5432)
```

### Estrutura de diretórios

```
ipng-ong-app/
├── .env.example
├── Makefile
├── docker-compose.yml               # Ambiente de desenvolvimento
├── docker-compose.prod.yml          # Ambiente de produção
├── init-ssl.sh
│
├── nginx/
│   └── templates/
│       └── app.conf.template
│
├── backend/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── seed.py                      # Cria usuário admin inicial
│   │
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── router.py        # Agrega todos os routers
│   │   │
│   │   ├── core/
│   │   │   ├── config.py            # Settings via pydantic-settings
│   │   │   ├── database.py          # Engine async + SessionLocal
│   │   │   ├── deps.py              # get_current_user, require_role, check_owner
│   │   │   ├── limiter.py           # Rate limiting (slowapi)
│   │   │   └── security.py          # Hash de senhas + JWT
│   │   │
│   │   ├── models/
│   │   │   ├── activity.py          # Activity, StudentActivity, StudentHighlight
│   │   │   ├── assessment.py        # Assessment, StudentGrade
│   │   │   ├── attendance.py        # Attendance
│   │   │   ├── audit.py             # AuditLog
│   │   │   ├── book.py              # Book, BookChapter
│   │   │   ├── book_loan.py         # BookLoan
│   │   │   ├── calendar.py          # CalendarEvent
│   │   │   ├── class_.py            # Class_, ClassAssignment
│   │   │   ├── lesson.py            # Lesson, LessonReport, LessonMaterial
│   │   │   ├── student.py           # Student, Enrollment
│   │   │   ├── unit.py              # Unit
│   │   │   └── user.py              # User, TeacherProfile
│   │   │
│   │   └── domains/
│   │       ├── activities/          → router, schemas, service
│   │       ├── assessments/         → router, schemas, service
│   │       ├── attendance/          → router, schemas, service
│   │       ├── audit/               → router, schemas
│   │       ├── auth/                → router, schemas, service
│   │       ├── books/               → router, schemas, service
│   │       ├── calendar/            → router, schemas, service
│   │       ├── classes/             → router, schemas, service
│   │       ├── lessons/             → router, schemas, service
│   │       ├── loans/               → router, schemas, service
│   │       ├── stats/               → router, schemas
│   │       ├── students/            → router, schemas, service, history_schemas, history_service
│   │       ├── units/               → router, schemas, service
│   │       └── users/               → router, schemas, service
│   │
│   ├── migrations/
│   │   ├── env.py
│   │   └── versions/
│   │       ├── 0001_initial_schema.py
│   │       ├── 0002_add_must_change_password.py
│   │       ├── 0003_add_book_loans.py
│   │       ├── 0004_add_student_extra_fields.py
│   │       ├── 0005_add_highlight_form_fields.py
│   │       └── 0006_add_user_atribuicoes.py
│   │
│   └── tests/
│       └── conftest.py
│
└── frontend/
    ├── Dockerfile
    ├── next.config.ts
    ├── package.json
    ├── tsconfig.json
    │
    ├── public/
    │   └── logo.png
    │
    └── src/
        ├── app/
        │   ├── page.tsx                         # Redirect raiz → /inicio
        │   ├── layout.tsx
        │   ├── globals.css
        │   │
        │   ├── (auth)/
        │   │   └── login/page.tsx
        │   │
        │   └── (dashboard)/
        │       ├── layout.tsx
        │       ├── inicio/page.tsx              # Tela inicial com cards de navegação
        │       ├── dashboard/page.tsx           # Métricas e gráficos por tabs
        │       ├── classes/page.tsx             # Gestão de turmas
        │       ├── students/page.tsx            # Gestão de alunos + matrículas
        │       ├── students/[id]/page.tsx       # Histórico completo do aluno
        │       ├── lessons/page.tsx             # Listagem de aulas
        │       ├── lessons/[id]/page.tsx        # Presença, relatório e materiais
        │       ├── assessments/page.tsx         # Listagem de avaliações
        │       ├── assessments/[id]/page.tsx    # Lançamento de notas
        │       ├── activities/page.tsx          # Atividades
        │       ├── highlights/page.tsx          # Destaques de alunos
        │       ├── calendar/page.tsx            # Calendário institucional
        │       ├── aniversariantes/page.tsx     # Aniversariantes do mês
        │       ├── users/page.tsx               # Gestão de usuários (admin)
        │       ├── units/page.tsx               # Gestão de unidades (admin)
        │       ├── books/page.tsx               # Gestão de livros
        │       ├── loans/page.tsx               # Biblioteca / empréstimos
        │       └── audit/page.tsx               # Logs de auditoria (admin)
        │
        ├── components/
        │   ├── shared/
        │   │   ├── AuthGuard.tsx
        │   │   ├── ChangePasswordModal.tsx
        │   │   └── Sidebar.tsx
        │   └── ui/                              # Componentes shadcn/ui
        │
        ├── hooks/
        │   └── use-auth.ts
        │
        ├── lib/
        │   ├── api.ts                           # Cliente Axios + todos os endpoints
        │   ├── excel.ts                         # Exportação/importação Excel
        │   └── utils.ts
        │
        └── types/
            └── index.ts                         # Tipos TypeScript globais
```

### Domínios da API

| Domínio | Endpoints principais |
|---|---|
| auth | `POST /auth/login`, `GET /auth/me` |
| users | CRUD de usuários (admin, coordenador, professor) |
| units | CRUD de unidades |
| classes | CRUD de turmas + alunos matriculados |
| students | CRUD de alunos + matrículas |
| lessons | Aulas + presença + relatório + materiais |
| assessments | Avaliações + lançamento de notas |
| activities | Atividades + registro de participação |
| highlights | Destaques de alunos |
| calendar | Eventos institucionais |
| audit | Logs de auditoria (somente leitura) |
| stats | Métricas do dashboard |

---

## Componentes do Frontend

### Páginas

| Rota | Descrição |
|---|---|
| `/login` | Autenticação |
| `/dashboard` | Métricas gerais (alunos, professores, turmas, faltas) |
| `/users` | Gestão de usuários do sistema |
| `/units` | Gestão de unidades |
| `/classes` | Gestão de turmas |
| `/students` | Gestão de alunos + matrículas |
| `/books` | Gestão de livros didáticos |
| `/lessons` | Listagem de aulas |
| `/lessons/[id]` | Presença, relatório e materiais da aula |
| `/assessments` | Listagem de avaliações |
| `/assessments/[id]` | Lançamento de notas |
| `/activities` | Atividades + participação dos alunos |
| `/highlights` | Destaques de alunos |
| `/calendar` | Calendário institucional |
| `/audit` | Logs de auditoria |

### Fluxo de autenticação

1. Login via `POST /auth/login` → recebe `access_token` (JWT, 60 min)
2. Token salvo no `localStorage`
3. `AuthGuard` verifica o token em todas as rotas do dashboard
4. `401` no interceptor Axios → limpa token e redireciona para `/login`

---

## Como rodar localmente

### Pré-requisitos
- Docker e Docker Compose instalados

### 1. Clonar e configurar

```bash
git clone https://github.com/cassio-rodrigues/ipng-ong-app.git
cd ipng-ong-app
cp .env.example .env
```

### 2. Subir os serviços

```bash
make up
```

### 3. Rodar migrations e seed

```bash
make migrate
make seed
```

### 4. Acessar

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend (Swagger) | http://localhost:8000/docs |

---

## Como fazer deploy em produção

### Pré-requisitos
- VPS com Ubuntu 22.04
- Docker instalado (`curl -fsSL https://get.docker.com | sh`)
- Domínio apontando para o IP do VPS (registros A para o domínio/subdomínio e para `api.<domínio>`)

### 1. Clonar e configurar

```bash
git clone https://github.com/cassio-rodrigues/ipng-ong-app.git
cd ipng-ong-app
cp .env.example .env
nano .env  # preencher com valores de produção
```

Variáveis obrigatórias no `.env`:

```env
POSTGRES_PASSWORD=senha_forte
DATABASE_URL=postgresql+asyncpg://ipng_user:senha_forte@db:5432/ipng_db
SECRET_KEY=<resultado de: openssl rand -hex 32>
CORS_ORIGINS=["https://seudominio.com"]
NEXT_PUBLIC_API_URL=https://api.seudominio.com
DOMAIN=seudominio.com
```

### 2. Subir serviços e obter certificado SSL

```bash
make prod-up
make prod-migrate
```

Obter certificado SSL (apenas na primeira vez):

```bash
apt install -y certbot
certbot certonly --standalone --email seu@email.com --agree-tos --no-eff-email \
  -d seudominio.com -d api.seudominio.com

docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
```

### 3. Criar usuário admin

```bash
docker compose -f docker-compose.prod.yml exec backend python seed.py
```

**Troque a senha do admin imediatamente após o primeiro login.**

### 4. Checklist de privacidade (LGPD)

Antes de liberar o acesso, siga o [checklist de produção da seção Privacidade e LGPD](#checklist-de-produção).

### Comandos úteis

```bash
make prod-up       # sobe/atualiza todos os serviços
make prod-down     # para todos os serviços
make prod-migrate  # roda migrations pendentes
make prod-logs     # acompanha logs em tempo real
```

---

## Segurança

### Autenticação
- Senhas com hash `bcrypt` (custo 12)
- JWT com expiração de 60 minutos
- Refresh token com expiração de 7 dias
- Sessões revogáveis: trocar a senha, ter a senha redefinida pelo admin ou usar "Sair de todos os dispositivos" invalida todos os tokens emitidos (`users.token_version`)
- Por padrão a sessão fica no `sessionStorage` e termina ao fechar o navegador; "Manter conectado" usa `localStorage`
- Limite de 5 tentativas de login por minuto
- Senhas com no mínimo 8 caracteres. Conta nova e senha definida pela coordenação são **provisórias**: a pessoa cria a própria senha no primeiro acesso. A coordenação também pode marcar "Exigir troca de senha no próximo login" no cadastro do usuário
- **Esqueceu sua senha?** envia por email um link de redefinição válido por 30 minutos e de uso único (o token embute uma impressão digital da senha atual). A resposta é a mesma exista ou não a conta, e o pedido é limitado a 3 por minuto. Requer as variáveis `SMTP_*` e `APP_URL` no `.env`; sem elas, a tela orienta a procurar a coordenação

### Transporte
- HTTPS obrigatório em produção (TLS 1.2 e 1.3)
- Redirect automático HTTP → HTTPS via Nginx
- Certificado Let's Encrypt com renovação automática pelo `certbot` (systemd timer)

### API
- CORS restrito às origens configuradas em `CORS_ORIGINS`
- Backend não expõe portas diretamente ao exterior em produção (apenas via Nginx)
- `SECRET_KEY` gerada com `openssl rand -hex 32` — com `DEBUG=false` o backend se recusa a subir com a chave padrão ou com menos de 32 caracteres
- Coordenação não altera contas de admin nem concede o perfil de admin

### Dados
- Soft-delete na maioria das entidades (campo `status`)
- Auditoria automática de toda criação, edição e exclusão (ver [Privacidade e LGPD](#privacidade-e-lgpd))
- Banco de dados acessível apenas pela rede interna do Docker

### Boas práticas recomendadas
- Trocar a senha do admin padrão imediatamente após o primeiro deploy
- Manter o `.env` fora do controle de versão (já no `.gitignore`)
- Fazer backup diário e criptografado com `make prod-backup` (requer `BACKUP_PASSPHRASE` no `.env`; guarde a senha fora da VPS). Para agendar, `crontab -e` na VPS:
  `0 3 * * * cd /root/ipng-ong-app && ./scripts/backup.sh >> backups/backup.log 2>&1`
  Copie a pasta `backups/` para fora da VPS periodicamente. Restauração: `./scripts/backup.sh restore backups/<arquivo>`.

---

## Privacidade e LGPD

O sistema guarda dados pessoais de alunos — muitos deles **menores de idade** — incluindo CPF, RG, endereço e dados do responsável. Por isso a Lei Geral de Proteção de Dados (Lei 13.709/2018) se aplica com o rigor do art. 14 (crianças e adolescentes). Esta seção descreve o que o código faz e o que fica sob responsabilidade da ONG.

> Esta é uma descrição técnica, não um parecer jurídico. A política de privacidade e os termos devem ser revisados por alguém da área.

### Dados tratados

| Titular | Dados | Onde |
|---|---|---|
| Aluno | Nome, nascimento, sexo, email, WhatsApp, escolaridade, unidade e turmas | `students`, `enrollments` |
| Aluno (sensíveis para a ONG) | RG, CPF, endereço | `students` |
| Responsável (aluno menor) | Nome, RG, CPF | `students.guardian_*` |
| Aluno (pedagógico) | Frequência, dever de casa, notas, atividades, destaques, acompanhamentos, empréstimos | `attendance`, `student_grades`, `student_highlights`, `student_followups`, `book_loans`… |
| Voluntários e equipe | Nome, email, telefone, nascimento, sexo, perfil | `users` |
| Uso do sistema | Quem criou, editou ou excluiu cada registro e quando | `audit_logs` |

### Medidas implementadas

**Minimização e controle de acesso (art. 6º, III e VII)** — `backend/app/core/privacy.py`
- Admin e coordenação veem o cadastro completo.
- Volunteachers veem **apenas os alunos das turmas em que dão aula** (principal ou atribuído), e a API **não envia** CPF, RG, endereço nem documentos do responsável (`SENSITIVE_STUDENT_FIELDS`). O WhatsApp continua visível para o contato com a turma.
- Aluno ou turma fora do escopo: a API responde 404/403 — a regra está no servidor, não só escondida na tela.
- Entre colegas, `GET /users/{id}` mostra nome e perfil; email, telefone e nascimento só para o próprio usuário e a coordenação (`SENSITIVE_USER_FIELDS`).
- Exportações de volunteachers saem sem as colunas de documentos.

**Consentimento (arts. 7º, I, 8º e 14)**
- Ao marcar "Aceite de termos" ou "Autorização de imagem", o servidor grava a data (`terms_accepted_at`, `image_consent_at`), a versão do termo (`terms_version`, vinda de `TERMS_VERSION` em `backend/app/core/config.py`) e quem consentiu (`consent_given_by`).
- **Menor de 18 anos:** o consentimento só é aceito com o nome do responsável preenchido — quem consente é o responsável.
- Retirar o consentimento apaga o registro correspondente.

**Direitos do titular (art. 18)** — no perfil do aluno, apenas coordenação
- **Exportar dados** (acesso, art. 18, II): baixa um JSON com cadastro, histórico (frequência, notas, atividades, destaques, empréstimos) e acompanhamentos.
- **Anonimizar** (eliminação, art. 18, VI, e fim do tratamento, art. 16): apaga nome, contato, nascimento, documentos, endereço, dados do responsável e o registro de consentimento, e inativa o aluno. Frequência e notas continuam nas estatísticas sem identificar a pessoa. Endpoint `POST /students/{id}/anonymize`.
- **Correção** (art. 18, III): edição normal do cadastro.

**Auditoria sem cópia de dados pessoais** — `backend/app/core/audit.py`
- Toda criação, edição e exclusão é registrada com autor e data, o que permite demonstrar responsabilidade (art. 6º, X).
- Documentos, endereço, contato, nascimento e dados do responsável **nunca têm o valor gravado** no log (`MASKED_FIELDS`) — só a indicação de que mudaram. Assim, excluir ou anonimizar um aluno apaga esses dados de fato.
- Na anonimização, o log registra quais campos mudaram sem nenhum valor, nem o nome antigo.
- A migração `0014` mascarou os registros gravados antes dessa regra.

**Segurança (art. 46)**
- HTTPS obrigatório, senhas com bcrypt, banco acessível só pela rede interna do Docker.
- Sessões revogáveis e, por padrão, encerradas ao fechar o navegador (computadores compartilhados).
- Backend não sobe em produção com `SECRET_KEY` fraca.
- Backup criptografado (AES-256, chave em `BACKUP_PASSPHRASE`) com `make prod-backup` — `scripts/backup.sh`.

**Transparência (art. 9º)**
- Página pública `/privacidade` (`frontend/src/app/privacidade/page.tsx`), com link na tela de login e no rodapé do menu. É um **rascunho**: os trechos entre [colchetes] devem ser preenchidos pela ONG.

### Checklist de produção

- [ ] `SECRET_KEY` com 32+ caracteres no `.env` (`openssl rand -hex 32`)
- [ ] `BACKUP_PASSPHRASE` no `.env`, guardada também **fora** da VPS
- [ ] Backup diário agendado no `crontab` e cópia periódica de `backups/` para fora da VPS
- [ ] `make prod-migrate` aplicado (inclui `0014`–`0016`)
- [ ] Senha do admin padrão trocada
- [ ] Política em `/privacidade` preenchida e revisada; ao mudar o texto, atualizar `TERMS_VERSION` e a versão exibida na página

### Responsabilidades da ONG (fora do código)

- **Encarregado (DPO):** indicar a pessoa e o contato na política de privacidade.
- **Termo de consentimento** assinado pelo responsável para alunos menores, guardado pela ONG — o sistema registra quem consentiu, mas não substitui o documento.
- **Prazo de guarda:** definir por quanto tempo manter dados de ex-alunos e usar **Anonimizar** quando vencer.
- **Pedidos dos titulares:** canal para receber pedidos de cópia, correção e exclusão, com resposta no prazo definido na política.
- **Incidentes:** em caso de vazamento, comunicar a ANPD e os titulares afetados (art. 48).
- **Acessos:** desativar usuários de voluntários que saírem do projeto.

### Ao desenvolver

- Toda rota nova que devolva dados de aluno ou usuário deve passar por `ensure_student_visible` / `redact` (`core/privacy.py`). Nunca confie só em esconder a coluna no frontend.
- Campo novo com dado pessoal: avalie incluir em `SENSITIVE_STUDENT_FIELDS` / `SENSITIVE_USER_FIELDS`, em `MASKED_FIELDS` (auditoria) e em `PERSONAL_FIELDS` (anonimização, `domains/students/service.py`).
- Não grave dados pessoais em logs de aplicação nem em mensagens de erro.

---

## Hospedagem atual

| Componente | Provedor | Especificação |
|---|---|---|
| VPS | Hostinger KVM 1 | Ubuntu 22.04, 1 vCPU, 4GB RAM |
| Domínio | inglesparanossagente.org | gestao.inglesparanossagente.org |
| SSL | Let's Encrypt | Renovação automática (90 dias) |

**URLs de produção:**
- Sistema: https://gestao.inglesparanossagente.org
- API: https://api.gestao.inglesparanossagente.org
- Swagger: https://api.gestao.inglesparanossagente.org/docs



