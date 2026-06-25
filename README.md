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
    ├── gestaoipng.com.br ──────► Frontend (Next.js :3000)
    │                                        │
    └── api.gestaoipng.com.br ──► Backend  (FastAPI :8000)
                                            │
                                       PostgreSQL (:5432)
```

### Estrutura de diretórios

```
ipng-ong-app/
├── backend/
│   ├── app/
│   │   ├── api/v1/router.py       # Agrega todos os routers
│   │   ├── core/                  # Config, DB, segurança, deps
│   │   ├── domains/               # Lógica por domínio (auth, users, classes…)
│   │   └── models/                # Models SQLAlchemy
│   ├── migrations/                # Alembic migrations
│   └── seed.py                    # Cria usuário admin inicial
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/      # Página de login
│       │   └── (dashboard)/       # Páginas autenticadas
│       ├── components/
│       │   ├── shared/            # AuthGuard, Sidebar
│       │   └── ui/                # Componentes shadcn/ui
│       ├── lib/api.ts             # Cliente Axios + interceptors
│       └── types/index.ts         # Tipos TypeScript
├── nginx/templates/app.conf.template
├── docker-compose.yml             # Ambiente de desenvolvimento
├── docker-compose.prod.yml        # Ambiente de produção
└── Makefile                       # Comandos utilitários
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

**Login padrão:** `admin@ipng.org` / `admin123`

---

## Como fazer deploy em produção

### Pré-requisitos
- VPS com Ubuntu 22.04
- Docker instalado (`curl -fsSL https://get.docker.com | sh`)
- Domínio apontando para o IP do VPS (registros A para `@`, `www` e `api`)

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
CORS_ORIGINS=["https://seudominio.com","https://www.seudominio.com"]
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
  -d seudominio.com -d www.seudominio.com -d api.seudominio.com

docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
```

### 3. Criar usuário admin

```bash
docker compose -f docker-compose.prod.yml exec backend python seed.py
```

**Troque a senha do admin imediatamente após o primeiro login.**

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

### Transporte
- HTTPS obrigatório em produção (TLS 1.2 e 1.3)
- Redirect automático HTTP → HTTPS via Nginx
- Certificado Let's Encrypt com renovação automática pelo `certbot` (systemd timer)

### API
- CORS restrito às origens configuradas em `CORS_ORIGINS`
- Backend não expõe portas diretamente ao exterior em produção (apenas via Nginx)
- `SECRET_KEY` gerada com `openssl rand -hex 32`

### Dados
- Soft-delete na maioria das entidades (campo `status`)
- Logs de auditoria para ações críticas
- Banco de dados acessível apenas pela rede interna do Docker

### Boas práticas recomendadas
- Trocar a senha do admin padrão imediatamente após o primeiro deploy
- Manter o `.env` fora do controle de versão (já no `.gitignore`)
- Fazer backup periódico do volume `pgdata` com `docker run --rm -v ipng-ong-app_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata.tar.gz /data`

---

## Hospedagem atual

| Componente | Provedor | Especificação |
|---|---|---|
| VPS | Hostinger KVM 1 | Ubuntu 22.04, 1 vCPU, 4GB RAM |
| Domínio | Hostinger | gestaoipng.com.br |
| SSL | Let's Encrypt | Renovação automática (90 dias) |

**URLs de produção:**
- Sistema: https://gestaoipng.com.br
- API: https://api.gestaoipng.com.br
- Swagger: https://api.gestaoipng.com.br/docs
