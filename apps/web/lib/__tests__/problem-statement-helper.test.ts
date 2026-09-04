import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { getProblemStatementDetails } from "../problem-statement-helper"
import type { Problem } from "@/types/problems"

describe("Problem Statement Helper & Details", () => {
  it("provides exact curated statement for 166A (Rank List)", () => {
    const problem: Problem = {
      id: "166A",
      platform: "codeforces",
      platform_problem_id: "CF_166_A",
      contest_id: 166,
      index: "A",
      name: "Rank List",
      rating: 1100,
      tags: ["binary search", "implementation", "sortings"],
      url: "https://codeforces.com/problemset/problem/166/A",
      solved_count: null,
    }

    const details = getProblemStatementDetails(problem)
    assert.ok(details.description.includes("Another Codeforces Round has just finished!"))
    assert.ok(details.description.includes("ranking table"))
    assert.ok(details.inputFormat.includes("two integers $n$ and $k$"))
    assert.ok(details.outputFormat.includes("number of participants"))
    assert.equal(details.sampleTests.length, 2)
    assert.equal(details.sampleTests[0]?.input, "7 2\n4 10\n4 10\n4 10\n3 20\n2 1\n2 1\n1 10\n")
    assert.equal(details.sampleTests[0]?.expected_output, "3\n")
    assert.equal(details.timeLimit, "2.0s")
    assert.equal(details.memoryLimit, "256MB")
  })

  it("provides exact curated statement for 2064B (Variety is Discouraged)", () => {
    const problem: Problem = {
      id: "2064B",
      platform: "codeforces",
      platform_problem_id: "CF_2064_B",
      contest_id: 2064,
      index: "B",
      name: "Variety is Discouraged",
      rating: 1100,
      tags: ["binary search", "constructive algorithms", "greedy", "two pointers"],
      url: "https://codeforces.com/problemset/problem/2064/B",
      solved_count: 8500,
    }

    const details = getProblemStatementDetails(problem)
    assert.ok(details.description.includes("Define the score of an arbitrary array"))
    assert.ok(details.description.includes("minimizes the score of the remaining array"))
    assert.equal(details.sampleTests.length, 1)
    assert.equal(details.sampleTests[0]?.input, "3\n1\n1\n5\n1 1 1 1 1\n4\n2 1 3 2\n")
    assert.equal(details.sampleTests[0]?.expected_output, "1 1\n0\n2 3\n")
    assert.equal(details.timeLimit, "1.5s")
  })

  it("generates tailored problem details for dynamic programming problem", () => {
    const problem: Problem = {
      id: "dp-1",
      platform: "codeforces",
      platform_problem_id: "CF_1800_C",
      contest_id: 1800,
      index: "C",
      name: "Card Game",
      rating: 1400,
      tags: ["dp"],
      url: "https://codeforces.com/contest/1800/problem/C",
      solved_count: 5000,
    }

    const details = getProblemStatementDetails(problem)
    assert.ok(details.description.includes("Card Game"))
    assert.ok(details.inputFormat.length > 0)
    assert.ok(details.outputFormat.length > 0)
    assert.ok(details.sampleTests.length > 0)
    assert.ok(!details.description.includes("temporarily unavailable"))
  })

  it("generates tailored problem details for graph problem", () => {
    const problem: Problem = {
      id: "graph-1",
      platform: "codeforces",
      platform_problem_id: "CF_1900_D",
      contest_id: 1900,
      index: "D",
      name: "Tree Paths",
      rating: 1700,
      tags: ["graphs", "dfs and similar"],
      url: "https://codeforces.com/contest/1900/problem/D",
      solved_count: 3000,
    }

    const details = getProblemStatementDetails(problem)
    assert.ok(details.description.includes("Tree Paths"))
    assert.ok(details.description.includes("vertices"))
    assert.ok(details.inputFormat.includes("edges"))
    assert.ok(details.sampleTests.length > 0)
  })
})
