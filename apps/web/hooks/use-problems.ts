import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getProblems,
  getRecommendations,
  getDailyMission,
  submitRecommendationFeedback,
  getHint,
  submitHintFeedback,
  getProblemStatement,
  type ProblemStatementResponse,
} from "@/lib/problems"
import type {
  RecommendationFeedback,
  ProblemRecommendation,
  HintFeedbackCreate,
} from "@/types/problems"

export function useProblemStatement(problemId: string | undefined) {
  return useQuery({
    queryKey: ["problemStatement", problemId],
    queryFn: () => getProblemStatement(problemId!),
    enabled: !!problemId,
    staleTime: 1000 * 60 * 60, // 1 hour caching
  })
}

export function useProblems(params: {
  platform?: string
  min_rating?: number
  max_rating?: number
  tags?: string
  search?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ["problems", params],
    queryFn: () => getProblems(params),
    placeholderData: (prev) => prev,
  })
}

export function useRecommendations(userId: string | undefined) {
  return useQuery({
    queryKey: ["recommendations", userId],
    queryFn: () => getRecommendations(userId!),
    enabled: !!userId,
  })
}

export function useDailyMission(userId: string | undefined) {
  return useQuery({
    queryKey: ["dailyMission", userId],
    queryFn: () => getDailyMission(userId!),
    enabled: !!userId,
    retry: false,
  })
}

export function useRecommendationFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, feedback }: { userId: string; feedback: RecommendationFeedback }) =>
      submitRecommendationFeedback(userId, feedback),
    onMutate: async ({ userId, feedback }) => {
      if (feedback.event_type === "skipped" || feedback.event_type === "solved_externally") {
        await queryClient.cancelQueries({ queryKey: ["recommendations", userId] })
        const previous = queryClient.getQueryData<ProblemRecommendation[]>([
          "recommendations",
          userId,
        ])

        if (previous) {
          queryClient.setQueryData<ProblemRecommendation[]>(["recommendations", userId], (old) =>
            old ? old.filter((rec) => rec.problem.id !== feedback.problem_id) : []
          )
        }
        return { previous }
      }
    },
    onError: (err, variables, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(["recommendations", variables.userId], context.previous)
      }
    },
  })
}

export function useHint(problemId: string, level: number, enabled: boolean) {
  return useQuery({
    queryKey: ["hint", problemId, level],
    queryFn: () => getHint(problemId, level),
    enabled: enabled && !!problemId && level >= 1 && level <= 4,
    staleTime: Infinity, // Hints never change, cache them forever in the browser
  })
}

export function useHintFeedback() {
  return useMutation({
    mutationFn: ({ problemId, feedback }: { problemId: string; feedback: HintFeedbackCreate }) =>
      submitHintFeedback(problemId, feedback),
  })
}
