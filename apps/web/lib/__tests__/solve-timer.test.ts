import { test, describe, beforeEach } from "node:test"
import assert from "node:assert/strict"
import {
  formatTimerSeconds,
  formatDurationHuman,
  TIMER_PRESETS,
  loadTimerState,
  saveTimerState,
  clearTimerState,
  type TimerState,
} from "../solve-timer"
import { recordSolveSession, getSolveHistory } from "../solve-history"

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }
}

describe("SolveTimer Formatting Utilities", () => {
  test("formats seconds to MM:SS and HH:MM:SS accurately", () => {
    assert.equal(formatTimerSeconds(0), "00:00")
    assert.equal(formatTimerSeconds(5), "00:05")
    assert.equal(formatTimerSeconds(59), "00:59")
    assert.equal(formatTimerSeconds(60), "01:00")
    assert.equal(formatTimerSeconds(125), "02:05")
    assert.equal(formatTimerSeconds(3599), "59:59")
    assert.equal(formatTimerSeconds(3600), "01:00:00")
    assert.equal(formatTimerSeconds(3665), "01:01:05")
    assert.equal(formatTimerSeconds(7325), "02:02:05")
  })

  test("handles negative seconds gracefully", () => {
    assert.equal(formatTimerSeconds(-10), "00:00")
  })

  test("supports forceHours flag", () => {
    assert.equal(formatTimerSeconds(125, true), "00:02:05")
    assert.equal(formatTimerSeconds(0, true), "00:00:00")
  })

  test("formats human readable duration", () => {
    assert.equal(formatDurationHuman(0), "0s")
    assert.equal(formatDurationHuman(45), "45s")
    assert.equal(formatDurationHuman(185), "3m 5s")
    assert.equal(formatDurationHuman(3600), "1h")
    assert.equal(formatDurationHuman(3670), "1h 1m 10s")
  })

  test("provides expected timer presets (15m, 30m, 60m, 90m)", () => {
    assert.equal(TIMER_PRESETS.length, 4)
    assert.equal(TIMER_PRESETS[0].seconds, 15 * 60)
    assert.equal(TIMER_PRESETS[1].seconds, 30 * 60)
    assert.equal(TIMER_PRESETS[2].seconds, 60 * 60)
    assert.equal(TIMER_PRESETS[3].seconds, 90 * 60)
  })
})

describe("SolveTimer Persistence & State Management", () => {
  beforeEach(() => {
    // Set up global window and localStorage
    const mockStorage = new MockLocalStorage()
    ;(globalThis as any).window = {
      localStorage: mockStorage,
      dispatchEvent: () => true,
    }
    ;(globalThis as any).localStorage = mockStorage
  })

  test("saves, loads, and clears timer state", () => {
    const problemId = "problem_1869A"
    const state: TimerState = {
      mode: "count_up",
      status: "paused",
      seconds: 245,
      targetSeconds: 1800,
      elapsedSolvingSeconds: 245,
      lastStartedAt: null,
      sessionStartedAt: "2026-08-31T00:00:00.000Z",
      problemId,
    }

    saveTimerState(problemId, state)
    const loaded = loadTimerState(problemId)

    assert.ok(loaded)
    assert.equal(loaded.problemId, problemId)
    assert.equal(loaded.seconds, 245)
    assert.equal(loaded.status, "paused")

    clearTimerState(problemId)
    const afterClear = loadTimerState(problemId)
    assert.equal(afterClear, null)
  })

  test("calculates elapsed time on reload if timer was active", () => {
    const problemId = "problem_2061B"
    const pastTime = Date.now() - 5000 // 5 seconds ago

    const runningState: TimerState = {
      mode: "count_up",
      status: "running",
      seconds: 10,
      targetSeconds: 1800,
      elapsedSolvingSeconds: 10,
      lastStartedAt: pastTime,
      sessionStartedAt: new Date(pastTime).toISOString(),
      problemId,
    }

    saveTimerState(problemId, runningState)
    const restored = loadTimerState(problemId)

    assert.ok(restored)
    assert.equal(restored.status, "running")
    // Should have added ~5 seconds
    assert.ok(restored.seconds >= 14 && restored.seconds <= 16)
    assert.ok(restored.elapsedSolvingSeconds >= 14 && restored.elapsedSolvingSeconds <= 16)
  })

  test("handles countdown expiration on reload", () => {
    const problemId = "problem_2258A"
    const pastTime = Date.now() - 10000 // 10 seconds ago

    const countdownState: TimerState = {
      mode: "count_down",
      status: "running",
      seconds: 5, // only 5s remained
      targetSeconds: 60,
      elapsedSolvingSeconds: 55,
      lastStartedAt: pastTime,
      sessionStartedAt: new Date(pastTime).toISOString(),
      problemId,
    }

    saveTimerState(problemId, countdownState)
    const restored = loadTimerState(problemId)

    assert.ok(restored)
    assert.equal(restored.seconds, 0)
    assert.equal(restored.status, "completed")
  })
})

describe("SolveHistory Recording", () => {
  beforeEach(() => {
    const mockStorage = new MockLocalStorage()
    ;(globalThis as any).window = {
      localStorage: mockStorage,
      dispatchEvent: () => true,
    }
    ;(globalThis as any).localStorage = mockStorage
  })

  test("records and retrieves solve attempts with duration", () => {
    const record = recordSolveSession({
      problemId: "1869A",
      problemName: "Make It Zero",
      durationSeconds: 312,
      startedAt: "2026-08-31T00:00:00.000Z",
      mode: "count_up",
      status: "submitted",
      language: "cpp",
    })

    assert.ok(record.id)
    assert.equal(record.durationSeconds, 312)
    assert.equal(record.status, "submitted")

    const history = getSolveHistory("1869A")
    assert.equal(history.length, 1)
    assert.ok(history[0])
    assert.equal(history[0].problemName, "Make It Zero")
    assert.equal(history[0].durationSeconds, 312)
  })
})
