import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from './api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });
}
