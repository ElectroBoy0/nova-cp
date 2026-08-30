"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  type TimerMode,
  type TimerStatus,
  type TimerState,
  formatTimerSeconds,
  loadTimerState,
  saveTimerState,
  clearTimerState,
} from "@/lib/solve-timer"

export interface UseSolveTimerOptions {
  problemId?: string
  problemName?: string
  /** If provided, sets up countdown mode matching virtual contest end */
  virtualContestEndTime?: number | null
  initialMode?: TimerMode
  initialTargetSeconds?: number
}

export function useSolveTimer({
  problemId = "default",
  problemName = "Problem",
  virtualContestEndTime,
  initialMode = "count_up",
  initialTargetSeconds = 30 * 60,
}: UseSolveTimerOptions = {}) {
  // Initialize state from storage if available
  const [state, setState] = useState<TimerState>(() => {
    const saved = loadTimerState(problemId)
    if (saved) return saved

    // If virtual contest provided
    if (virtualContestEndTime) {
      const remainingSec = Math.max(0, Math.floor((virtualContestEndTime - Date.now()) / 1000))
      return {
        mode: "count_down",
        status: remainingSec > 0 ? "running" : "completed",
        seconds: remainingSec,
        targetSeconds: remainingSec,
        elapsedSolvingSeconds: 0,
        lastStartedAt: remainingSec > 0 ? Date.now() : null,
        sessionStartedAt: new Date().toISOString(),
        problemId,
        isVirtualContest: true,
        contestEndTime: virtualContestEndTime,
      }
    }

    return {
      mode: initialMode,
      status: "idle",
      seconds: initialMode === "count_up" ? 0 : initialTargetSeconds,
      targetSeconds: initialTargetSeconds,
      elapsedSolvingSeconds: 0,
      lastStartedAt: null,
      sessionStartedAt: new Date().toISOString(),
      problemId,
    }
  })

  // Keep state ref updated for timer tick & cleanup
  const stateRef = useRef(state)
  stateRef.current = state

  // Problem switch handling: reload timer for current problem
  useEffect(() => {
    const saved = loadTimerState(problemId)
    if (saved) {
      setState(saved)
    } else if (virtualContestEndTime) {
      const remainingSec = Math.max(0, Math.floor((virtualContestEndTime - Date.now()) / 1000))
      setState({
        mode: "count_down",
        status: remainingSec > 0 ? "running" : "completed",
        seconds: remainingSec,
        targetSeconds: remainingSec,
        elapsedSolvingSeconds: 0,
        lastStartedAt: remainingSec > 0 ? Date.now() : null,
        sessionStartedAt: new Date().toISOString(),
        problemId,
        isVirtualContest: true,
        contestEndTime: virtualContestEndTime,
      })
    } else {
      setState({
        mode: initialMode,
        status: "idle",
        seconds: initialMode === "count_up" ? 0 : initialTargetSeconds,
        targetSeconds: initialTargetSeconds,
        elapsedSolvingSeconds: 0,
        lastStartedAt: null,
        sessionStartedAt: new Date().toISOString(),
        problemId,
      })
    }
  }, [problemId, virtualContestEndTime, initialMode, initialTargetSeconds])

  // Save to storage on state changes
  useEffect(() => {
    saveTimerState(problemId, state)
  }, [problemId, state])

  // Active Timer Tick Loop
  useEffect(() => {
    if (state.status !== "running") return

    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.status !== "running" || !prev.lastStartedAt) return prev

        const now = Date.now()
        const deltaSec = Math.max(0, Math.floor((now - prev.lastStartedAt) / 1000))
        if (deltaSec === 0) return prev

        const newElapsed = prev.elapsedSolvingSeconds + deltaSec

        if (prev.mode === "count_up") {
          return {
            ...prev,
            seconds: prev.seconds + deltaSec,
            elapsedSolvingSeconds: newElapsed,
            lastStartedAt: now,
          }
        } else {
          // Count down mode
          const newRemaining = Math.max(0, prev.seconds - deltaSec)
          const isFinished = newRemaining === 0

          return {
            ...prev,
            seconds: newRemaining,
            elapsedSolvingSeconds: newElapsed,
            status: isFinished ? "completed" : "running",
            lastStartedAt: isFinished ? null : now,
          }
        }
      })
    }, 500) // 500ms check ensures sub-second responsiveness without drift

    return () => clearInterval(interval)
  }, [state.status])

  // Actions
  const start = useCallback(() => {
    setState((prev) => {
      if (prev.status === "running") return prev
      // If completed count down, restart
      let initialSeconds = prev.seconds
      if (prev.mode === "count_down" && prev.seconds === 0) {
        initialSeconds = prev.targetSeconds
      }
      return {
        ...prev,
        status: "running",
        seconds: initialSeconds,
        lastStartedAt: Date.now(),
      }
    })
  }, [])

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "running") return prev
      return {
        ...prev,
        status: "paused",
        lastStartedAt: null,
      }
    })
  }, [])

  const toggle = useCallback(() => {
    setState((prev) => {
      if (prev.status === "running") {
        return {
          ...prev,
          status: "paused",
          lastStartedAt: null,
        }
      } else {
        let initialSeconds = prev.seconds
        if (prev.mode === "count_down" && prev.seconds === 0) {
          initialSeconds = prev.targetSeconds
        }
        return {
          ...prev,
          status: "running",
          seconds: initialSeconds,
          lastStartedAt: Date.now(),
        }
      }
    })
  }, [])

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: "idle",
      seconds: prev.mode === "count_up" ? 0 : prev.targetSeconds,
      elapsedSolvingSeconds: 0,
      lastStartedAt: null,
      sessionStartedAt: new Date().toISOString(),
    }))
  }, [])

  const setCountUp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: "count_up",
      seconds: prev.elapsedSolvingSeconds,
      status: prev.status === "running" ? "running" : "idle",
      lastStartedAt: prev.status === "running" ? Date.now() : null,
    }))
  }, [])

  const setCountDown = useCallback((targetSeconds: number) => {
    setState((prev) => ({
      ...prev,
      mode: "count_down",
      targetSeconds,
      seconds: targetSeconds,
      status: prev.status === "running" ? "running" : "idle",
      lastStartedAt: prev.status === "running" ? Date.now() : null,
    }))
  }, [])

  const setCustomMinutes = useCallback(
    (minutes: number) => {
      const validMinutes = Math.max(1, Math.min(minutes, 360)) // 1 min to 6 hours
      setCountDown(validMinutes * 60)
    },
    [setCountDown]
  )

  /**
   * Capture solving duration in seconds for submission records
   */
  const captureSubmissionDuration = useCallback((): number => {
    return stateRef.current.elapsedSolvingSeconds || stateRef.current.seconds || 0
  }, [])

  const formattedTime = formatTimerSeconds(state.seconds)
  const isRunning = state.status === "running"
  const isPaused = state.status === "paused"
  const isCompleted = state.status === "completed"

  return {
    ...state,
    formattedTime,
    isRunning,
    isPaused,
    isCompleted,
    start,
    pause,
    toggle,
    reset,
    setCountUp,
    setCountDown,
    setCustomMinutes,
    captureSubmissionDuration,
  }
}
