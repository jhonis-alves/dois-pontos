import { ReceiptText } from 'lucide-react';
import type { SpaceMember } from '../../lib/auth-api';
import type {
  FinanceAccount,
  FinanceCategory,
  FinanceTransaction,
} from '../../lib/finance-api';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { TransactionCard } from './TransactionCard';

interface TransactionListProps {
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  members: SpaceMember[];
  monthLabel: string;
}

export function TransactionList({
  transactions,
  accounts,
  categories,
  members,
  monthLabel,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ReceiptText}
          title="Nenhuma transação neste mês"
          description={`Não há receitas, despesas ou transferências em ${monthLabel}. Crie a primeira acima ou escolha outro mês.`}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          accounts={accounts}
          categories={categories}
          members={members}
        />
      ))}
    </div>
  );
}
