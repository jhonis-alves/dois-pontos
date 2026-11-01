# Progresso — Dois Pontos

Última atualização: 29/10/2026

## Fase 1 — Fundação (concluída)

### Entregue

- Monorepo com workspaces `apps/api` e `apps/web`.
- API Fastify com `/api/health`, tratamento de erro estruturado e desligamento gracioso.
- SQLite com WAL, chaves estrangeiras e `busy_timeout`.
- Migrações versionadas:
  - `001_access.sql`: usuários, sessões, espaços, membros, convites, categorias e log.
  - `002_routine.sql`: recorrências, tarefas, subtarefas, comentários, hábitos e eventos.
  - `003_finance.sql`: contas, cartões, compras parceladas, faturas, parcelas, transações, orçamentos e metas.
- Seeds idempotentes de categorias padrão (compartilhadas e privadas).
- Testes da API para health, 404, migrações, limite de membros e seeds.
- Design system com tokens de cor, tipografia, espaçamento, sombras e estados.
- Temas claro/escuro/automático e paletas masculina, feminina e compartilhada.
- Shell responsivo com sidebar recolhível, topbar, seletor de contexto e navegação inferior no mobile.
- Rotas e páginas: Dashboard, Rotina, Calendário, Financeiro, Relatórios, Configurações e 404.
- Configurações funcionais de tema e paleta, persistidas apenas no dispositivo.
- Dashboard lendo o estado real da API/banco.
- Manifest PWA e ícones provisórios.
- Testes de navegação e preferências na web.
- README com instalação, scripts, banco, PWA, segurança e limitações.

### Decisões

- SQLite local nesta fase para manter o projeto executável sem serviço externo. A troca para banco remoto/sincronização continua adiada; a Fase 2 manteve o SQLite local.
- Valores monetários sempre em centavos inteiros.
- `localStorage` apenas para preferências não sensíveis.
- Autorização planejada no servidor, nunca só na interface.
- Identidade visual provisória (dois pontos conectados), sem afirmar uso da logo oficial.

### Verificações executadas

- `npm install` concluído; scripts nativos aprovados com `npm install-scripts approve better-sqlite3 esbuild` e `npm rebuild better-sqlite3`.
- `npm run typecheck` — aprovado (API e web).
- `npm test` — aprovado: 5 testes da API e 3 testes da web.
- `npm run lint` — aprovado sem erros.
- `npm run build` — aprovado (API e web).
- `npm run db:migrate` — aplicou `001_access.sql`, `002_routine.sql` e `003_finance.sql`.
- Smoke test da API compilada — `/api/health` respondeu `status: ok` e `database: up`.

### Limitações

- Sem autenticação, sessões ou convites funcionais.
- Sem sincronização entre dispositivos.
- Sem service worker ou modo offline.
- Telas de Rotina, Calendário, Financeiro e Relatórios são informativas.
- Sem dados de demonstração misturados a dados reais.

## Fase 2 — Autenticação e espaço do casal (concluída)

### Entregue

- Cadastro com nome, e-mail, senha e paleta opcional; login e logout.
- Senhas derivadas com `scrypt` (salt aleatório e comparação em tempo constante).
- Sessões opacas de 30 dias, armazenadas como hash SHA-256, com cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Limpeza de sessões expiradas na inicialização da API.
- Criação automática do **Nosso Espaço**, vínculo `owner` e categorias padrão no cadastro.
- Convite de uso único com expiração de 1 a 30 dias, prévia pública e aceite com ou sem conta.
- Revogação de convite não utilizado e limite de dois membros ativos por espaço.
- Uma conta só pode estar vinculada a um espaço ativo.
- Rotas protegidas por sessão na API e por `RequireAuth` na web.
- Telas de login, cadastro e aceite de convite.
- Menu de usuário com saída da conta e seção **Espaço do casal** nas configurações.
- Dashboard com nome do usuário, espaço e membros reais.
- Autorização por escopo centralizada em `lib/scope.ts`, pronta para os registros das próximas fases, com testes unitários de privacidade.
- Cabeçalhos de segurança (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`) e erros estruturados sem vazar detalhes internos.
- README e esta documentação atualizados.

### Decisões

- Sessão opaca em SQLite em vez de JWT: revogação imediata e menos complexidade.
- `scrypt` nativo do Node em vez de dependência externa de hash.
- Espaço criado automaticamente no cadastro; o segundo membro entra somente por convite.
- Convite de uso único, com expiração e revogação, em vez de código permanente.
- Recuperação de senha adiada: sem provedor de e-mail, a interface avisa que o recurso ainda não está disponível.
- Limite de dois membros reforçado no banco por gatilho, além da validação na aplicação.

### Verificações executadas

- `npm run typecheck` — aprovado (API e web).
- `npm run lint` — aprovado sem erros.
- `npm test` — aprovado: 19 testes da API e 5 testes da web (24 no total), incluindo escopo privado/compartilhado.
- `npm run build` — aprovado (API e web).
- Smoke test HTTP real: cadastro da Ana → convite → prévia → cadastro da Bia pelo convite → `/api/auth/me` com dois membros (`Ana: owner`, `Bia: member`).

### Limitações

- Sem recuperação de senha por e-mail.
- Sem sincronização entre dispositivos; o SQLite continua local.
- Convites são exibidos uma única vez; o link não pode ser recuperado depois.
- Sem limite de tentativas de login ou bloqueio temporário.
- Sem verificação de e-mail.

## Fase 3 — Rotina (concluída)

### Entregue

- CRUD de tarefas com título, descrição, prioridade, prazo, visibilidade e responsável.
- Tarefas compartilhadas por padrão, com opção privada; tarefas privadas ficam isoladas por dono.
- Responsável pode ser o casal (sem responsável) ou um membro específico.
- Subtarefas com criação, conclusão, edição e remoção.
- Recorrência diária, semanal e mensal com intervalo de 1 a 30 e data final opcional.
- Geração idempotente de ocorrências, com horizonte de 60 dias completado ao listar a rotina.
- Hábitos com frequência diária, semanal ou mensal, meta por período e check-in por data.
- Cálculo de progresso do período e sequência atual de cada hábito.
- Arquivamento de tarefas e hábitos.
- Tela de Rotina com abas, filtros de tarefas, criação, edição inline e check-in de hábitos.
- Dashboard com contadores reais de tarefas e hábitos.
- Autorização por escopo aplicada a tarefas, subtarefas e hábitos.
- Testes de API para isolamento privado/compartilhado, recorrência, datas e hábitos.

### Decisões

- Tarefas e hábitos primeiro; calendário, eventos e comentários ficam para a próxima etapa da Rotina.
- Recorrência simples (diária/semanal/mensal com intervalo), sem RRULE completa.
- Visibilidade compartilhada por padrão, mantendo a opção privada.
- Tarefa pode pertencer ao casal ou a uma pessoa.
- Ocorrências são materializadas com antecedência em vez de calculadas em tempo real; isso simplifica conclusão e histórico.
- Editar uma ocorrência não reescreve a série inteira nesta fase.

### Verificações executadas

- `npm run typecheck` — aprovado (API e web).
- `npm run lint` — aprovado sem erros.
- `npm test` — aprovado: 30 testes da API e 6 testes da web (36 no total).
- `npm run build` — aprovado (API e web).
- Testes cobrem: escopo privado/compartilhado, tarefas, subtarefas, arquivamento, recorrência semanal, validação de recorrência, hábitos, check-in, sequência, datas futuras e cálculo de datas.
- Smoke test HTTP real: Ana cria tarefa semanal (9 ocorrências), Bia vê a série e conclui uma ocorrência; Bia registra check-in em hábito compartilhado e o progresso fica `1/2`.

### Limitações

- Calendário, eventos, comentários e lembretes ainda não foram implementados.
- A série recorrente é gerada com 60 dias de antecedência e não é reescrita ao editar uma ocorrência.
- Não há limite de tarefas por período nem paginação na listagem.
- A sequência de hábitos é calculada sobre os últimos 400 dias de registros.
- Sem sincronização entre dispositivos.

## Fase 4 — Financeiro (em andamento)

### Incremento 1 — Contas e transações (concluído)

#### Entregue

- CRUD de contas compartilhadas (corrente, digital, dinheiro, poupança, reserva e outra).
- Saldo inicial em centavos, titular opcional e arquivamento de conta.
- Cálculo de saldo realizado e previsto por conta a partir das transações.
- CRUD de transações de receita, despesa e transferência.
- Competência, vencimento, pagamento, categoria, conta, responsável e observações.
- Status previsto, pendente, pago, recebido e cancelado, validado por tipo.
- Transferências entre contas sem contar como receita ou despesa no resumo.
- Categorias financeiras compartilhadas padrão por espaço.
- Resumo mensal de receitas, despesas e resultado, filtrável por mês.
- Cancelamento de transação preservando histórico e removendo dos cálculos.
- Tela Financeiro conectada à API com contas, formulário de lançamento, edição, liquidação e cancelamento.
- Testes de contas, transações, saldos, transferências, validações e acesso compartilhado entre membros.

### Decisões

- Todos os registros financeiros desta etapa são compartilhados entre o casal, sem opção privada, conforme escolha do produto.
- Excluir uma transação significa cancelar, não apagar: o histórico permanece e os cálculos ignoram o cancelado.
- O tipo da transação é imutável após a criação para não invalidar categoria, status e sinais de saldo.
- Transferência usa uma única linha com conta de origem e destino; o saldo é ajustado nas duas pontas.
- Saldo previsto inclui lançamentos planejados e pendentes; saldo atual considera apenas pago/recebido.
- Cartões e faturas foram adiados para o próximo incremento, já com a regra escolhida de fechamento e vencimento.

### Verificações executadas

- `npm run typecheck` — aprovado (API e web).
- `npm run lint` — aprovado sem erros.
- `npm test` — aprovado: 34 testes da API e 7 testes da web (41 no total).
- `npm run build` — aprovado (API e web).
- Smoke test HTTP no servidor de desenvolvimento: `/api/finance/accounts` responde `401` sem sessão e a web continua em `200`.

### Limitações

- Cartões, compras parceladas e faturas foram implementados no incremento 2; orçamentos, metas e relatórios ainda faltam.
- Não há categorias financeiras personalizadas pela interface; apenas as padrão compartilhadas.
- Sem filtros por conta, categoria ou status além do mês de referência.
- Sem paginação nas listagens.
- Sem sincronização entre dispositivos; o SQLite continua local.

## Fase 4 — Incremento 2: cartões, parcelamentos e faturas (concluído)

### Entregue neste incremento

- CRUD de cartões compartilhados com nome, instituição, titular, limite, fechamento, vencimento e conta de pagamento.
- Cálculo de limite usado (parcelas pendentes) e disponível.
- Compra à vista ou parcelada em até 48 vezes, com valor total, data da compra, primeira parcela, categoria, responsável e observações.
- Geração idempotente de parcelas com soma exata em centavos e vínculo à fatura correspondente.
- Faturas por mês de referência, com fechamento e vencimento derivados dos dias do cartão.
- Alocação automática: compras até o fechamento entram na fatura corrente; depois do fechamento, na seguinte.
- Cada parcela gera uma despesa pendente vinculada ao cartão e à parcela; a conta de pagamento só é afetada quando a fatura é paga.
- Pagamento de fatura por transferência da conta escolhida para uma conta interna, marcando parcelas como pagas e sem duplicar a despesa.
- Cancelamento de compra sem parcelas pagas, cancelando parcelas e despesas e liberando o limite.
- Bloqueio de edição/cancelamento direto de transações de cartão, que só mudam pela compra ou pela fatura.
- Tela Financeiro com cartões, limite, formulário de compra parcelada, faturas do mês com pagamento e lista de compras com cancelamento.
- Testes de cartões, parcelamento, alocação por fechamento, pagamento, limite, cancelamento, isolamento entre espaços e bloqueios.

### Decisões

- Cartões e compras continuam somente compartilhados nesta etapa.
- Cada parcela é uma despesa pendente; a despesa é reconhecida na competência do vencimento da parcela.
- O pagamento da fatura é uma transferência para uma conta interna (`system_kind = 'card_settlement'`), invisível nas listagens, evitando contabilizar a compra duas vezes.
- Transações vinculadas a cartão são imutáveis pela tela de transações; correções passam pelo cancelamento da compra.
- A primeira parcela pode ser informada, mas o vencimento é normalizado para o dia de vencimento do cartão.

### Verificações executadas

- `npm run typecheck` — aprovado (API e web).
- `npm run lint` — aprovado sem erros.
- `npm test` — aprovado: 43 testes da API e 7 testes da web (50 no total).
- `npm run build` — aprovado (API e web).
- `npm run db:migrate` — aplicou `004_card_settlement.sql` no banco local.
- Testes cobrem: visibilidade compartilhada, validação de dias/conta, parcelas e arredondamento, fechamento, faturas, pagamento sem duplicação, limite, cancelamento, autorização entre espaços e bloqueio de edição direta.

### Limitações

- Compras no cartão não têm edição; é preciso cancelar e registrar novamente enquanto não houver parcela paga.
- Não há estorno de fatura já paga nem edição de parcelas individuais.
- Orçamentos, metas e relatórios ainda não foram implementados.
- Sem sincronização entre dispositivos; o SQLite continua local.

## Próximo passo — concluir a Fase 4

1. Orçamentos por categoria e metas com contribuições e progresso.
2. Relatórios financeiros conectados à API real.
3. Testes de orçamentos, metas e autorização entre membros.


