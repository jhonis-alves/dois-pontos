import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptInvite,
  createInvite,
  fetchInvite,
  fetchSession,
  fetchSpace,
  loginAccount,
  logoutAccount,
  registerAccount,
  revokeInvite,
  type AcceptInviteInput,
  type CreateInviteInput,
  type LoginInput,
  type RegisterInput,
} from './auth-api';

export const SESSION_QUERY_KEY = ['session'] as const;
export const SPACE_QUERY_KEY = ['space'] as const;

export function inviteQueryKey(token: string) {
  return ['invite', token] as const;
}

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => loginAccount(input),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session);
      queryClient.removeQueries({ queryKey: SPACE_QUERY_KEY });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterInput) => registerAccount(input),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session);
      queryClient.removeQueries({ queryKey: SPACE_QUERY_KEY });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutAccount,
    onSettled: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: SPACE_QUERY_KEY });
    },
  });
}

export function useInvite(token: string) {
  return useQuery({
    queryKey: inviteQueryKey(token),
    queryFn: () => fetchInvite(token),
    retry: false,
    enabled: token.length > 0,
  });
}

export function useAcceptInvite(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptInviteInput) => acceptInvite(token, input),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session);
      queryClient.removeQueries({ queryKey: SPACE_QUERY_KEY });
      queryClient.removeQueries({ queryKey: inviteQueryKey(token) });
    },
  });
}

export function useSpaceDetails() {
  return useQuery({
    queryKey: SPACE_QUERY_KEY,
    queryFn: fetchSpace,
    retry: false,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInviteInput) => createInvite(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SPACE_QUERY_KEY });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SPACE_QUERY_KEY });
    },
  });
}
