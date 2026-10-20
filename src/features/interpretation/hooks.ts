"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { interpretationRuleApi } from "@/mocks/services/resources";
import type { InterpretationRule } from "@/types/domain";

const KEY = "interpretation-rules";

export const useInterpretationRules = (params: { status?: string; search?: string; franchiseId?: string } = {}, enabled = true) =>
  useQuery({
    queryKey: [KEY, params.status, params.search, params.franchiseId],
    queryFn: () => interpretationRuleApi.list(params),
    select: (response) => (response.data || []) as InterpretationRule[],
    staleTime: 60_000,
    enabled,
  });

export function useInterpretationRuleMutations() {
  const client = useQueryClient();
  const onSuccess = () => client.invalidateQueries({ queryKey: [KEY] });
  return {
    save: useMutation({
      mutationFn: ({ id, input }: { id?: string; input: Partial<InterpretationRule> }) =>
        id ? interpretationRuleApi.update(id, input) : interpretationRuleApi.create(input),
      onSuccess,
    }),
    approve: useMutation({ mutationFn: (id: string) => interpretationRuleApi.approve(id), onSuccess }),
    deactivate: useMutation({ mutationFn: (id: string) => interpretationRuleApi.deactivate(id), onSuccess }),
    remove: useMutation({ mutationFn: (id: string) => interpretationRuleApi.delete(id), onSuccess }),
  };
}
