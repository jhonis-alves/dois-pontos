import { useState } from 'react';
import {
  CreditCard,
  Landmark,
  ReceiptText,
  RotateCcw,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AccountCard } from '../components/finance/AccountCard';
import { AccountComposer } from '../components/finance/AccountComposer';
import { CardComposer } from '../components/finance/CardComposer';
import { CreditCardPanel } from '../components/finance/CreditCardPanel';
import { InvoiceList } from '../components/finance/InvoiceList';
import { PurchaseComposer } from '../components/finance/PurchaseComposer';
import { PurchaseList } from '../components/finance/PurchaseList';
import { TransactionForm } from '../components/finance/TransactionForm';
import { TransactionList } from '../components/finance/TransactionList';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useSession } from '../lib/auth-hooks';
import { formatMonthLabel } from '../lib/finance-format';
import {
  useCreateFinanceTransaction,
  useFinanceAccounts,
  useFinanceCards,
  useFinanceCategories,
  useFinanceInvoices,
  useFinancePurchases,
  useFinanceTransactions,
} from '../lib/finance-hooks';
import { formatCurrencyFromCents, todayIso } from '../lib/format';

export function FinancePage() {
  const session = useSession();
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [purchaseCardId, setPurchaseCardId] = useState('');
  const [purchasesCardId, setPurchasesCardId] = useState('');

  const accountsQuery = useFinanceAccounts();
  const categoriesQuery = useFinanceCategories();
  const cardsQuery = useFinanceCards();
  const transactionsQuery = useFinanceTransactions(month);
  const invoicesQuery = useFinanceInvoices(month);
  const createTransaction = useCreateFinanceTransaction();

  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const cards = cardsQuery.data ?? [];
  const transactions = transactionsQuery.data?.transactions ?? [];
  const summary = transactionsQuery.data?.summary;
  const invoices = invoicesQuery.data ?? [];

  const selectedPurchaseCardId = purchaseCardId || cards[0]?.id || '';
  const selectedPurchasesCardId = purchasesCardId || cards[0]?.id || '';
  const purchasesQuery = useFinancePurchases(selectedPurchasesCardId);
  const purchases = purchasesQuery.data ?? [];
  const selectedPurchasesCard = cards.find(
    (card) => card.id === selectedPurchasesCardId,
  );

  const totalBalance = accounts.reduce(
    (total, account) => total + account.balanceCents,
    0,
  );
  const totalProjected = accounts.reduce(
    (total, account) => total + account.projectedBalanceCents,
    0,
  );
  const monthLabel = formatMonthLabel(month);

  const isLoading =
    session.isLoading ||
    accountsQuery.isLoading ||
    categoriesQuery.isLoading ||
    cardsQuery.isLoading ||
    transactionsQuery.isLoading ||
    invoicesQuery.isLoading;
  const isError =
    accountsQuery.isError ||
    categoriesQuery.isError ||
    cardsQuery.isError ||
    transactionsQuery.isError ||
    invoicesQuery.isError;

  function reload() {
    void accountsQuery.refetch();
    void categoriesQuery.refetch();
    void cardsQuery.refetch();
    void transactionsQuery.refetch();
    void invoicesQuery.refetch();
    void purchasesQuery.refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Financeiro" title="Financeiro do casal" />
        <Card className="p-6">
          <p className="text-sm text-[var(--muted)]">
            Carregando finanças...
          </p>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Financeiro" title="Financeiro do casal" />
        <Card className="p-6">
          <div className="form-error" role="alert">
            Não foi possível carregar contas e transações.
          </div>
          <Button variant="ghost" className="mt-3" onClick={reload}>
            <RotateCcw size={16} aria-hidden="true" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fase 4 · Financeiro"
        title="Financeiro do casal"
        description="Contas, receitas, despesas, transferências compartilhadas, cartões, compras parceladas e faturas. Orçamentos e metas entram nas próximas etapas."
        actions={<Badge variant="primary">Fase 4</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Saldo atual</p>
            <Scale
              size={17}
              className="text-[var(--primary)]"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-xl font-bold">
            {formatCurrencyFromCents(totalBalance)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Previsto</p>
            <Wallet size={17} className="text-[var(--accent)]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold">
            {formatCurrencyFromCents(totalProjected)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Receitas do mês</p>
            <TrendingUp
              size={17}
              className="text-[var(--success)]"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-xl font-bold">
            {formatCurrencyFromCents(summary?.incomeCents ?? 0)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Despesas do mês</p>
            <TrendingDown
              size={17}
              className="text-[var(--danger)]"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-xl font-bold">
            {formatCurrencyFromCents(summary?.expenseCents ?? 0)}
          </p>
        </Card>
      </div>

      <section className="space-y-4" aria-labelledby="accounts-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Patrimônio do casal</p>
            <h2 id="accounts-title" className="section-title mt-1">
              Contas
            </h2>
          </div>
          <span className="text-xs text-[var(--muted)]">
            {accounts.length} {accounts.length === 1 ? 'conta ativa' : 'contas ativas'}
          </span>
        </div>

        <AccountComposer members={session.data?.members ?? []} />

        {accounts.length === 0 ? (
          <Card>
            <EmptyState
              icon={Landmark}
              title="Nenhuma conta cadastrada"
              description="Crie a primeira conta para começar a registrar receitas, despesas e transferências."
            />
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                members={session.data?.members ?? []}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="cards-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Crédito do casal</p>
            <h2 id="cards-title" className="section-title mt-1">
              Cartões
            </h2>
          </div>
          <span className="text-xs text-[var(--muted)]">
            {cards.length}{' '}
            {cards.length === 1 ? 'cartão ativo' : 'cartões ativos'}
          </span>
        </div>

        <CardComposer
          accounts={accounts}
          members={session.data?.members ?? []}
        />

        {cards.length === 0 ? (
          <Card>
            <EmptyState
              icon={CreditCard}
              title="Nenhum cartão cadastrado"
              description="Cadastre um cartão para registrar compras, acompanhar o limite e organizar as faturas por fechamento e vencimento."
            />
          </Card>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <CreditCardPanel
                  key={card.id}
                  card={card}
                  onNewPurchase={(cardId) => setPurchaseCardId(cardId)}
                />
              ))}
            </div>

            <PurchaseComposer
              cards={cards}
              categories={categories}
              members={session.data?.members ?? []}
              cardId={selectedPurchaseCardId}
              onCardChange={setPurchaseCardId}
            />
          </>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="invoices-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Fechamento e vencimento</p>
            <h2 id="invoices-title" className="section-title mt-1">
              Faturas de {monthLabel}
            </h2>
          </div>
        </div>

        <InvoiceList
          invoices={invoices}
          accounts={accounts}
          monthLabel={monthLabel}
        />
      </section>

      {cards.length > 0 && (
        <section className="space-y-4" aria-labelledby="purchases-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Parcelamentos</p>
              <h2 id="purchases-title" className="section-title mt-1">
                Compras do cartão
              </h2>
            </div>

            <div className="field w-full max-w-56">
              <label className="field-label" htmlFor="purchases-card">
                Cartão
              </label>
              <select
                id="purchases-card"
                className="input"
                value={selectedPurchasesCardId}
                onChange={(event) => setPurchasesCardId(event.target.value)}
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <PurchaseList
            purchases={purchases}
            cardName={selectedPurchasesCard?.name ?? ''}
          />
        </section>
      )}

      <section className="space-y-4" aria-labelledby="transactions-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Lançamentos</p>
            <h2 id="transactions-title" className="section-title mt-1">
              Transações
            </h2>
          </div>

          <div className="field w-full max-w-52">
            <label className="field-label" htmlFor="finance-month">
              Mês de referência
            </label>
            <input
              id="finance-month"
              className="input"
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) setMonth(event.target.value);
              }}
            />
          </div>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <EmptyState
              icon={ReceiptText}
              title="Crie uma conta antes de lançar"
              description="Toda receita, despesa ou transferência precisa estar ligada a uma conta ativa."
            />
          </Card>
        ) : (
          <Card className="p-5">
            <div className="mb-4">
              <p className="eyebrow">Novo lançamento</p>
              <h3 className="section-title mt-1">Registrar transação</h3>
            </div>

            <TransactionForm
              accounts={accounts}
              categories={categories}
              members={session.data?.members ?? []}
              submitLabel={
                createTransaction.isPending ? 'Salvando...' : 'Adicionar transação'
              }
              onSubmit={async (input) => {
                await createTransaction.mutateAsync(input);
              }}
            />
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {monthLabel} · {transactions.length}{' '}
            {transactions.length === 1 ? 'lançamento' : 'lançamentos'}
          </p>
          {summary && (
            <p className="text-xs text-[var(--muted)]">
              Resultado do mês:{' '}
              <strong className="text-[var(--text)]">
                {formatCurrencyFromCents(summary.netCents)}
              </strong>
            </p>
          )}
        </div>

        <TransactionList
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          members={session.data?.members ?? []}
          monthLabel={monthLabel}
        />
      </section>
    </div>
  );
}
