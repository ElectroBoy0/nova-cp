import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getProblems,
  searchProblems,
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
  ProblemSearchResult,
} from "@/types/problems"

export function useProblemSearch(params: {
  q: string
  limit?: number
  offset?: number
  userId?: string
}) {
  return useQuery({
    queryKey: ["problemSearch", params],
    queryFn: () => searchProblems(params),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })
}

export function useProblemStatement(problemId: string | undefined, sessionCookie?: string) {
  return useQuery({
    queryKey: ["problemStatement", problemId, sessionCookie],
    queryFn: () => getProblemStatement(problemId!, sessionCookie),
    enabled: !!problemId,
    staleTime: (query) => (query.state.data?.is_fallback ? 0 : 1000 * 60 * 60),
    retry: 2,
    retryDelay: 1000,
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
        await queryClient.cancelQueries({ queryKey: ["dailyMission", userId] })

        const prevRecs = queryClient.getQueryData<ProblemRecommendation[]>([
          "recommendations",
          userId,
        ])
        const prevMission = queryClient.getQueryData<ProblemRecommendation>([
          "dailyMission",
          userId,
        ])

        if (prevRecs) {
          queryClient.setQueryData<ProblemRecommendation[]>(["recommendations", userId], (old) =>
            old ? old.filter((rec) => rec.problem.id !== feedback.problem_id) : []
          )
        }
        if (prevMission && prevMission.problem.id === feedback.problem_id) {
          queryClient.setQueryData(["dailyMission", userId], null)
        }

        return { prevRecs, prevMission }
      }
    },
    onError: (err, variables, context: any) => {
      if (context?.prevRecs) {
        queryClient.setQueryData(["recommendations", variables.userId], context.prevRecs)
      }
      if (context?.prevMission) {
        queryClient.setQueryData(["dailyMission", variables.userId], context.prevMission)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recommendations", variables.userId] })
      queryClient.invalidateQueries({ queryKey: ["dailyMission", variables.userId] })
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
