# Dois Pontos

Aplicação web para casais organizarem a rotina e as finanças em um só lugar. A interface é em português do Brasil, com moeda BRL e datas em `DD/MM/AAAA`.

O projeto está em desenvolvimento por fases. As **Fases 1 (Fundação)**, **2 (Autenticação e espaço do casal)** e **3 (Rotina)** estão concluídas. A **Fase 4 (Financeiro)** está em andamento: contas, transações, cartões, compras parceladas e faturas já funcionam; orçamentos, metas e relatórios entram nas próximas etapas.

## Stack

- **Web:** React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query, Lucide.
- **API:** Fastify 5, TypeScript, Zod.
- **Banco:** SQLite via `better-sqlite3`, com migrações SQL versionadas.
- **Testes:** Vitest + Testing Library (web) e Vitest + `app.inject` (API).

## Estrutura

```text
apps/
  api/
    db/migrations/      Migrações SQL (acesso, rotina e finanças)
    src/
      db/seeds.ts       Categorias padrão por espaço
      lib/              Banco, datas, sessões, senhas, validação e escopo
      routes/           Rotas HTTP (health, auth, convites, espaço, tarefas, hábitos, finanças)
      services/         Regras de autenticação, convites, tarefas, hábitos e finanças
      scripts/          Script de migração
  web/
    public/             Manifest e ícones da PWA
    src/
      components/       Layout, UI, autenticação, espaço, rotina, finanças e identidade visual
      context/          Preferências de tema, paleta e contexto
      lib/              API, sessão, rotina, finanças, formatação e utilitários
      pages/            Rotas da aplicação
      styles/           Tokens e design system
```

## Requisitos

- Node.js **22.13 ou superior** (testado com Node 24).
- npm 10 ou superior.

> O npm 12 pode bloquear scripts de instalação de dependências nativas. Se o `better-sqlite3` ou o `esbuild` não funcionarem após o `npm install`, execute:
>
> ```bash
> npm install-scripts approve better-sqlite3 esbuild
> npm rebuild better-sqlite3
> ```

## Instalação e execução local

```bash
npm install
```

Crie o arquivo de ambiente a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

No Linux/macOS:

```bash
cp .env.example .env
```

Aplique as migrações e suba API + web:

```bash
npm run db:migrate
npm run dev
```

- Web: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:3333>
- Saúde da API: <http://127.0.0.1:3333/api/health>

O Vite faz proxy de `/api` para a API local.

### Acesso pelo celular

O servidor web escuta em todas as interfaces (`0.0.0.0`). Com o celular no mesmo Wi-Fi/roteador do PC:

1. Descubra o IPv4 do PC (no Windows: `Get-NetIPAddress -AddressFamily IPv4`).
2. Abra `http://IP-DO-PC:5173` no navegador do celular (ex.: `http://192.168.0.103:5173`).
3. Se não abrir, permita o Node/Vite na porta `5173` no firewall do Windows, perfil **Privada**.

O acesso funciona apenas na rede local e o IP pode mudar ao reiniciar o roteador. Não exponha essa porta em redes públicas.

## Autenticação e espaço do casal

Cada pessoa tem uma conta própria. Ao criar a conta, o **Nosso Espaço** é criado automaticamente e a pessoa entra como `owner`. A segunda pessoa entra por um convite de uso único.

Fluxo para testar localmente:

1. Abra `http://127.0.0.1:5173/cadastro` e crie a primeira conta.
2. Em **Configurações → Espaço do casal**, gere um convite.
3. Copie o link e abra em uma janela anônima (ou outro navegador).
4. Crie a segunda conta pelo convite. O espaço passa a ter dois membros ativos.
5. Saia e entre novamente para validar a sessão persistente.

Endpoints principais:

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Cria conta, espaço, categorias e sessão |
| `POST` | `/api/auth/login` | Autentica e inicia sessão |
| `POST` | `/api/auth/logout` | Encerra a sessão atual |
| `GET` | `/api/auth/me` | Retorna usuário, espaço e membros |
| `GET` | `/api/invites/:token` | Prévia pública do convite |
| `POST` | `/api/invites/:token/accept` | Entra no espaço (com ou sem conta) |
| `GET` | `/api/spaces/current` | Membros e convites do espaço |
| `POST` | `/api/spaces/invites` | Gera convite de uso único |
| `DELETE` | `/api/spaces/invites/:id` | Revoga convite não utilizado |

Regras aplicadas no servidor:

- Sessão opaca com hash SHA-256 no banco e cookie `HttpOnly`, `SameSite=Lax`.
- Senhas com `scrypt` e salt aleatório; nunca em texto puro.
- Convites expiram (1 a 30 dias), são de uso único e podem ser revogados.
- Limite de dois membros ativos por espaço, reforçado por gatilho no SQLite.
- Uma conta só pode estar vinculada a um espaço ativo.
- Autorização por escopo centralizada em `apps/api/src/lib/scope.ts`.

## Rotina

A Fase 3 entrega tarefas, subtarefas e hábitos. Compromissos e a visão de calendário ficam para a próxima etapa.

- **Visibilidade:** compartilhada por padrão, com opção privada. Registros privados só são acessíveis ao dono; compartilhados ficam disponíveis aos dois membros.
- **Responsável:** uma tarefa pode ser do casal (sem responsável) ou de uma pessoa específica.
- **Recorrência:** diária, semanal ou mensal, com intervalo de 1 a 30 e data final opcional. As ocorrências são materializadas com 60 dias de antecedência; ao abrir a rotina, a API completa o horizonte sem duplicar datas.
- **Hábitos:** frequência diária, semanal ou mensal, meta por período e check-in por data. A API calcula o progresso do período e a sequência atual.
- **Edição:** cada ocorrência de uma série pode ser editada ou arquivada individualmente; alterações não reescrevem as demais ocorrências.

Endpoints principais:

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/tasks` | Lista tarefas visíveis, já com subtarefas |
| `POST` | `/api/tasks` | Cria tarefa, recorrência e ocorrências futuras |
| `PATCH` | `/api/tasks/:id` | Edita título, prazo, prioridade, status ou responsável |
| `DELETE` | `/api/tasks/:id` | Arquiva a tarefa |
| `POST` | `/api/tasks/:id/subtasks` | Adiciona subtarefa |
| `PATCH` | `/api/tasks/:id/subtasks/:subtaskId` | Edita ou conclui subtarefa |
| `DELETE` | `/api/tasks/:id/subtasks/:subtaskId` | Remove subtarefa |
| `GET` | `/api/habits` | Lista hábitos com progresso e sequência |
| `POST` | `/api/habits` | Cria hábito |
| `PATCH` | `/api/habits/:id` | Edita nome, frequência ou meta |
| `DELETE` | `/api/habits/:id` | Arquiva o hábito |
| `PUT` | `/api/habits/:id/entries/:date` | Registra ou atualiza o check-in |
| `DELETE` | `/api/habits/:id/entries/:date` | Remove o check-in |

## Financeiro

A Fase 4 entrega contas, categorias padrão, transações, cartões, compras parceladas e faturas. Todos os registros financeiros são **compartilhados entre o casal** nesta etapa, sem opção privada.

- **Contas:** corrente, digital, dinheiro, poupança, reserva ou outra, com saldo inicial em centavos e arquivamento.
- **Transações:** receita, despesa ou transferência, com competência, vencimento, pagamento, categoria, conta, responsável e observações.
- **Saldos:** a API calcula o saldo realizado (pago/recebido) e o previsto (inclui pendentes e previstos) de cada conta.
- **Transferências:** movem o valor entre contas e não entram como receita ou despesa no resumo.
- **Status:** previsto, pendente, pago, recebido ou cancelado, com validação por tipo de transação.
- **Mês de referência:** a tela filtra os lançamentos por competência e mostra receitas, despesas e resultado do mês.
- **Cancelamento:** excluir uma transação a marca como cancelada, preservando o histórico e removendo-a dos cálculos.
- **Cartões:** limite total, limite usado/disponível, fechamento, vencimento, titular e conta de pagamento.
- **Compras parceladas:** cada parcela gera uma despesa pendente na fatura correspondente, com arredondamento em centavos e até 48 parcelas.
- **Faturas:** fechamento e vencimento calculados pelo cartão; compras após o fechamento entram na fatura seguinte.
- **Pagamento de fatura:** cria uma transferência da conta de pagamento para uma conta interna, marca as parcelas como pagas e **não duplica a despesa**.
- **Limite e cancelamento:** o limite usado considera parcelas pendentes; cancelar uma compra sem parcelas pagas libera o limite.

Endpoints principais:

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/finance/accounts` | Lista contas ativas com saldo atual e previsto |
| `POST` | `/api/finance/accounts` | Cria conta compartilhada |
| `PATCH` | `/api/finance/accounts/:id` | Edita nome, tipo, titular ou saldo inicial |
| `DELETE` | `/api/finance/accounts/:id` | Arquiva a conta |
| `GET` | `/api/finance/categories` | Lista categorias financeiras compartilhadas |
| `GET` | `/api/finance/transactions?month=AAAA-MM` | Lista transações do mês com resumo |
| `POST` | `/api/finance/transactions` | Cria receita, despesa ou transferência |
| `PATCH` | `/api/finance/transactions/:id` | Edita ou liquida a transação |
| `DELETE` | `/api/finance/transactions/:id` | Cancela a transação |
| `GET` | `/api/finance/cards` | Lista cartões com limite usado e disponível |
| `POST` | `/api/finance/cards` | Cria cartão compartilhado |
| `PATCH` | `/api/finance/cards/:id` | Edita limite, dias de fechamento/vencimento ou conta de pagamento |
| `DELETE` | `/api/finance/cards/:id` | Arquiva o cartão |
| `GET` | `/api/finance/cards/:id/purchases` | Lista compras e parcelas do cartão |
| `POST` | `/api/finance/cards/:id/purchases` | Registra compra, gera parcelas, faturas e despesas pendentes |
| `DELETE` | `/api/finance/purchases/:id` | Cancela compra sem parcelas pagas |
| `GET` | `/api/finance/invoices?month=AAAA-MM` | Lista faturas do mês com totais |
| `POST` | `/api/finance/invoices/:id/pay` | Paga a fatura e liquida as parcelas |

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe API e web em modo desenvolvimento |
| `npm run build` | Compila API e web |
| `npm run typecheck` | Verifica TypeScript nos dois apps |
| `npm test` | Executa os testes da API e da web |
| `npm run lint` | Executa o ESLint |
| `npm run db:migrate` | Aplica migrações pendentes no SQLite |
| `npm start` | Inicia a API compilada |

## Banco de dados

As migrações ficam em `apps/api/db/migrations` e são aplicadas em ordem, uma transação por arquivo. O controle fica na tabela `schema_migrations`.

- `001_access.sql`: usuários, sessões, espaços, membros, convites, categorias e log de atividades.
- `002_routine.sql`: recorrências, tarefas, subtarefas, comentários, hábitos e eventos.
- `003_finance.sql`: contas, cartões, compras parceladas, faturas, parcelas, transações, orçamentos e metas.
- `004_card_settlement.sql`: conta interna para liquidar faturas sem dupla contabilização.

Valores monetários são inteiros em **centavos**. O banco tem restrições para evitar duplicação de parcelas, recorrências e membros acima do limite de dois por espaço.

Por padrão, o banco fica em `apps/api/data/dois-pontos.sqlite` (ignorado pelo Git).

## PWA

O manifest e os ícones estão em `apps/web/public`. O service worker e o fluxo de instalação controlada serão implementados na Fase 6. O app ainda não promete funcionamento offline.

## Segurança e privacidade

- A autenticação, a rotina e o financeiro com cartões e faturas já estão ativos. Ainda assim, o projeto está em desenvolvimento: orçamentos, metas e relatórios ainda faltam, então evite depender do app como fonte única para dados financeiros reais.
- `localStorage` guarda somente tema, paleta, contexto e estado da barra lateral. A sessão fica em cookie `HttpOnly`.
- Senhas são derivadas com `scrypt`; tokens de sessão são opacos e armazenados apenas como hash SHA-256.
- A autorização por registro é aplicada no servidor; a interface não é a única barreira.
- Em produção, o cookie de sessão usa `Secure` e exige HTTPS.
- Nunca inclua credenciais reais no repositório.

## Limitações atuais

- O SQLite é local; sincronização entre dispositivos ainda não existe.
- A recuperação de senha está pendente: não há provedor de e-mail configurado. Quem esquecer a senha precisa de intervenção manual no banco.
- O convite é de uso único e o espaço aceita no máximo duas pessoas ativas.
- Calendário, eventos e lembretes ainda não estão implementados.
- A recorrência gera ocorrências com 60 dias de antecedência e não reescreve a série ao editar uma ocorrência.
- As telas de Calendário e Relatórios ainda são informativas.
- O financeiro cobre contas, transações, cartões, parcelamentos e faturas; orçamentos, metas e relatórios ainda não têm interface.
- Compras no cartão não podem ser editadas; para corrigir, cancele a compra enquanto não houver parcela paga.
- Cartões e compras são somente compartilhados nesta fase, sem opção privada.
- Não há service worker nem modo offline.
- Os testes cobrem fundação, autenticação, convites, escopo, tarefas, recorrências, hábitos, finanças e navegação protegida.

## Progresso e próximos passos

O resumo detalhado das fases está em [`PROGRESSO.md`](./PROGRESSO.md). O próximo passo é concluir a **Fase 4 — Financeiro**: orçamentos por categoria, metas com contribuições e relatórios conectados à API.
