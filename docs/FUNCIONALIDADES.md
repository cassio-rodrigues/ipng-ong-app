# O que há de novo no sistema de gestão da IPNG

Este guia explica, tela por tela, as funcionalidades novas do sistema e como usá-las no dia a dia.

---

## 1. Tela Início: o resumo do dia

É a primeira tela depois do login. Ela mostra o que está acontecendo hoje e o que precisa de atenção.

- **Números da ONG** (só para coordenação e administração): total de alunos, alunos ativos, unidades ativas e volunteachers ativos.
- **Números do dia:**
  - **Aulas hoje.**
  - **Chamadas pendentes:** aulas de hoje que já começaram e ainda não têm presença lançada. Clicar leva direto para a chamada.
  - **Pendências:** fica vermelho quando há aluno em risco de evasão.
  - **Aniversariantes da semana.**
- **Próximas aulas:** as aulas dos próximos dias, com o selo "Chamada feita" ou "Chamada pendente" e o aviso de feriado quando for o caso.
- **Prioridades:** as 4 pendências mais urgentes, com botão para resolver ali mesmo.
- **Aniversariantes da semana:** quem faz aniversário hoje aparece destacado, com o botão **"Parabenizar"**, que abre o WhatsApp com uma mensagem pronta.
- **Minhas turmas:** atalho para as turmas em que você dá aula. Um clique abre a turma.
- **Atalhos:** acesso a todos os módulos, no fim da página.

---

## 2. Pendências: o que precisa de ação

Nova entrada no menu, com um contador vermelho. O sistema identifica sozinho as situações que pedem ação e as reúne aqui.

**O que vira pendência:**

| Pendência | Quando aparece |
|---|---|
| 🔴 **Risco de evasão** | Aluno com frequência abaixo de 60% ou com 3 faltas seguidas |
| 🔴 **Turma sem professor** | Turma ativa sem nenhum professor |
| 🔴 **Aula sem presença lançada** | Aula que já terminou e ninguém fez a chamada |
| 🟠 **Nota baixa** | Nota abaixo do mínimo de aprovação da avaliação |
| 🟠 **Destaque negativo** | Destaque negativo registrado nos últimos 90 dias |
| 🟡 **Voluntário sem lançar presença** | As turmas do volunteacher tiveram aula nos últimos 14 dias sem chamada |
| 🔵 **Checar dever de casa** | A aula anterior passou dever, e a próxima aula está chegando |
| 🟣 **Aula em feriado** | Aula agendada num dia marcado como feriado no calendário |
| 🟡 **Empréstimo atrasado** | Livro da biblioteca não devolvido no prazo |
| 🟢 **Destaque positivo** | Aluno com destaque positivo, candidato a Day Out, mentoria ou intercâmbio |

**Como resolver uma pendência:**
1. Clique em **"Registrar ação"**.
2. Escreva o que foi feito, por exemplo "Liguei para a mãe, ele volta sábado".
3. Escolha uma opção:
   - **Resolvido:** a pendência sai da lista.
   - **Adiar 7 dias:** a pendência volta daqui a uma semana.

O que foi feito fica guardado no histórico do aluno. Se um aluno em risco faltar de novo depois de alguém resolver, a pendência volta e mostra o que foi feito da última vez.

**Contato direto:** pendências de alunos e de voluntários têm um botão de **WhatsApp** com uma mensagem sugerida. A mensagem só é enviada se você confirmar no WhatsApp.

**Quem vê o quê:** volunteachers veem só as pendências das próprias turmas. Coordenação e administração veem todas, incluindo turmas sem professor, voluntários inativos, destaques positivos e livros atrasados.

---

## 3. Turmas

### Lista de turmas
- **Coluna "Alunos":** quantos alunos estão matriculados em cada turma.
- **Coluna "Horário":** o dia e a hora da aula semanal, por exemplo "Sábados, 9h–11h".
- **Selo vermelho "⚠ Sem professor"** nas turmas ativas sem nenhum professor.
- Para volunteachers, a lista mostra primeiro **"Minhas turmas"**, e dá para trocar para "Todas as turmas".

### Horário fixo e aulas automáticas
Cada turma tem um dia e horário fixos. Ao cadastrar ou editar a turma, preencha **"Aula semanal"** com o dia, o início e o fim.

- O sistema **cria sozinho todas as aulas** até a data de fim da turma, ou pelos próximos 4 meses se ela não tiver data de fim.
- **Feriados** cadastrados no calendário são pulados automaticamente.
- **Mudança de horário:** as aulas futuras que ainda não foram usadas passam para o novo horário.
- **Planilha:** a importação e a exportação de turmas também têm as colunas de dia e horário.

### Dentro da turma: tudo em um lugar
Ao abrir uma turma, você encontra as abas:

- **Hoje:** a aula do dia, com os botões grandes **"Fazer chamada"** e **"Relatório"**.
  - Mostra se a chamada já foi feita.
  - Avisa quando hoje ou a próxima aula é feriado.
  - Se a aula de hoje não existir, o botão **"Iniciar aula de hoje"** cria a aula no horário da turma.
  - Mostra também as pendências da turma.
- **Alunos:** a lista com frequência e média.
  - **Alunos em risco** (frequência abaixo de 60% ou média abaixo de 6) aparecem com a **linha vermelha e o ícone ⚠**.
  - Alunos que pedem **atenção** aparecem com uma borda amarela.
  - A etiqueta **"✨ Potencial"** marca quem tem média alta mas falta muito. Vale investigar o motivo.
  - Clique nos títulos **Aluno**, **Frequência** ou **Média** para ordenar a lista.
- **Aulas:** todas as aulas da turma, com dever de casa e relatório.
  - O botão **"+ Nova aula"** serve para reposições e aulas extras.
  - O botão **"Gerar aulas"** estende o calendário da turma.
- **Avaliações:** as avaliações da turma, com quantas notas já foram lançadas.
  - O botão **"+ Nova avaliação"** cria a avaliação e já abre a tela de notas.
- **Atividades:** as atividades da turma.
- **Destaques:** os destaques dos alunos da turma.
- **Professores:** quem dá aula na turma.

---

## 4. Chamada (presença)

- **"Todos presentes":** um clique marca a turma inteira como presente e já salva. Depois é só ajustar quem faltou e salvar de novo.
- **Dever de casa na chamada:** se a aula anterior passou dever, ele aparece no topo, por exemplo "📚 Dever da aula anterior: páginas 3 e 5". Ao lado de cada aluno ficam três botões:
  - **✓ Fez**
  - **✗ Não fez**
  - **— N/A** (não se aplica)
  - O botão **"Todos fizeram"** marca todos os presentes de uma vez.
- **Confirmação ao salvar:** o sistema mostra, por exemplo, "Presença salva · 10 presentes, 2 faltas".
- **Feriado:** se a aula cair num feriado, aparece um aviso no topo.

---

## 5. Ficha do aluno

- **Pendências do aluno** no topo da ficha, com as ações ali mesmo.
- **Botão de WhatsApp** ao lado do nome, quando o aluno tem telefone cadastrado.
- **Cards coloridos pela gravidade:** frequência, faltas (em % das aulas) e média.
- **Aba "Presença":** mostra se o aluno fez o dever em cada aula.
- **Aba "Acompanhamento":** o histórico de tudo o que foi feito pelo aluno, com a data e quem fez.

---

## 6. As cores do sistema

O vermelho agora é usado só para o que é realmente sério.

| | 🟢 Verde | 🟡 Amarelo | 🔴 Vermelho |
|---|---|---|---|
| **Frequência** | 85% ou mais | de 70% a 85% | abaixo de 70% |
| **Faltas** | menos de 10% das aulas | de 10% a 20% | mais de 20% |
| **Média** | 8 ou mais | de 6 a 8 | abaixo de 6 |
| **Destaques** | positivo | outros | negativo |

---

## 7. Dashboard

- **Próximas aulas** no topo.
- **Evolução:** escolha **últimos 30 dias**, **este semestre** ou **este ano** e compare com o período anterior. São quatro números: novos alunos, aulas com chamada, frequência média e faltas. A seta verde indica melhora e a vermelha indica piora.
- **Calendário completo:** mostra **aulas**, **feriados**, **eventos institucionais**, **eventos de turma** e **aniversários**, cada um com sua cor. Clique num dia para ver tudo o que acontece nele. Volunteachers veem só as aulas das próprias turmas.

---

## 8. Análise (coordenação e administração)

Nova tela no menu para responder perguntas como "quantas mulheres com Ensino Superior estudam em Barueri no Book 3?".

- **Seis gráficos:** gênero, faixa etária, escolaridade, unidade, livro e nível.
- **Clique numa barra para filtrar.** Os filtros se combinam e tudo se recalcula na hora.
- **Número grande no topo** com o total de alunos filtrados.
- **Lista dos alunos filtrados** embaixo, com acesso à ficha de cada um.
- **Exportar:** em **CSV**, **Excel** ou **PDF**.

---

## 9. Aniversariantes

- Cada aniversariante tem o botão **"Parabenizar"** (ou **"WhatsApp"** para quem ainda vai fazer aniversário no mês), que abre o WhatsApp com uma mensagem de parabéns pronta.
- Os aniversários também aparecem no **Início** (os da semana) e no **calendário do dashboard**.

---

## Dicas rápidas

- **Para o volunteacher em sala:** Início → **Minhas turmas** → sua turma → **Fazer chamada** → **Todos presentes** → marque quem faltou e quem fez o dever → salvar.
- **Para a secretaria ao abrir o sistema:** veja os números do Início e as **Prioridades**, depois vá em **Pendências** e registre o que foi feito em cada uma.
- **Antes de um feriado:** cadastre-o no **Calendário**. As aulas desse dia passam a aparecer como pendência para serem canceladas ou remarcadas, e as próximas aulas geradas já pulam a data.
