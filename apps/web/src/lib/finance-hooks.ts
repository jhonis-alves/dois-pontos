import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveFinanceAccount,
  archiveFinanceCard,
  cancelFinancePurchase,
  cancelFinanceTransaction,
  createFinanceAccount,
  createFinanceCard,
  createFinancePurchase,
  createFinanceTransaction,
  fetchFinanceAccounts,
  fetchFinanceCards,
  fetchFinanceCategories,
  fetchFinanceInvoices,
  fetchFinancePurchases,
  fetchFinanceTransactions,
  payFinanceInvoice,
  updateFinanceAccount,
  updateFinanceCard,
  updateFinanceTransaction,
  type FinanceAccountInput,
  type FinanceAccountUpdateInput,
  type FinanceCardInput,
  type FinanceCardUpdateInput,
  type FinanceInvoicePayInput,
  type FinancePurchaseInput,
  type FinanceTransactionInput,
} from './finance-api';

const FINANCE_PREFIX = ['finance'] as const;

export const FINANCE_ACCOUNTS_QUERY_KEY = ['finance', 'accounts'] as const;
export const FINANCE_CATEGORIES_QUERY_KEY = ['finance', 'categories'] as const;
export const FINANCE_CARDS_QUERY_KEY = ['finance', 'cards'] as const;
export const financeTransactionsQueryKey = (month: string) =>
  ['finance', 'transactions', month] as const;
export const financeInvoicesQueryKey = (month: string) =>
  ['finance', 'invoices', month] as const;
export const financePurchasesQueryKey = (cardId: string) =>
  ['finance', 'purchases', cardId] as const;

function invalidateFinance(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: FINANCE_PREFIX });
}

export function useFinanceAccounts() {
  return useQuery({
    queryKey: FINANCE_ACCOUNTS_QUERY_KEY,
    queryFn: fetchFinanceAccounts,
    retry: false,
  });
}

export function useFinanceCategories() {
  return useQuery({
    queryKey: FINANCE_CATEGORIES_QUERY_KEY,
    queryFn: fetchFinanceCategories,
    retry: false,
  });
}

export function useFinanceTransactions(month: string) {
  return useQuery({
    queryKey: financeTransactionsQueryKey(month),
    queryFn: () => fetchFinanceTransactions(month),
    retry: false,
  });
}

export function useCreateFinanceAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FinanceAccountInput) => createFinanceAccount(input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateFinanceAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      accountId: string;
      input: FinanceAccountUpdateInput;
    }) => updateFinanceAccount(params.accountId, params.input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useArchiveFinanceAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveFinanceAccount,
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useCreateFinanceTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FinanceTransactionInput) =>
      createFinanceTransaction(input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateFinanceTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      transactionId: string;
      input: Partial<FinanceTransactionInput>;
    }) => updateFinanceTransaction(params.transactionId, params.input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useCancelFinanceTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelFinanceTransaction,
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useFinanceCards() {
  return useQuery({
    queryKey: FINANCE_CARDS_QUERY_KEY,
    queryFn: fetchFinanceCards,
    retry: false,
  });
}

export function useFinanceInvoices(month: string) {
  return useQuery({
    queryKey: financeInvoicesQueryKey(month),
    queryFn: () => fetchFinanceInvoices(month),
    retry: false,
  });
}

export function useFinancePurchases(cardId: string) {
  return useQuery({
    queryKey: financePurchasesQueryKey(cardId),
    queryFn: () => fetchFinancePurchases(cardId),
    enabled: cardId.length > 0,
    retry: false,
  });
}

export function useCreateFinanceCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FinanceCardInput) => createFinanceCard(input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useUpdateFinanceCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      cardId: string;
      input: FinanceCardUpdateInput;
    }) => updateFinanceCard(params.cardId, params.input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useArchiveFinanceCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveFinanceCard,
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useCreateFinancePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      cardId: string;
      input: FinancePurchaseInput;
    }) => createFinancePurchase(params.cardId, params.input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function useCancelFinancePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelFinancePurchase,
    onSuccess: () => invalidateFinance(queryClient),
  });
}

export function usePayFinanceInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      invoiceId: string;
      input: FinanceInvoicePayInput;
    }) => payFinanceInvoice(params.invoiceId, params.input),
    onSuccess: () => invalidateFinance(queryClient),
  });
}
