import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

export const useDashboard = () => useQuery({
  queryKey: ['dashboard'],
  queryFn: () => fetchApi('/v1/dashboard/summary')
});

export const useOccurrences = (limit = 50) => useQuery({
  queryKey: ['occurrences', limit],
  queryFn: () => fetchApi(`/v1/occurrences?limit=${limit}`)
});

export const useOccurrenceDetail = (id: string) => useQuery({
  queryKey: ['occurrence', id],
  queryFn: () => fetchApi(`/v1/occurrences/${id}`),
  enabled: !!id
});

export const useMapOccurrences = () => useQuery({
  queryKey: ['occurrences-map'],
  queryFn: () => fetchApi('/v1/occurrences/map')
});

export const useServiceOrders = () => useQuery({
  queryKey: ['service-orders'],
  queryFn: () => fetchApi('/v1/field/work-orders')
});

export const useTriageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string, decision: string }) => 
      fetchApi(`/v1/occurrences/${id}/triage`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['occurrence'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};
