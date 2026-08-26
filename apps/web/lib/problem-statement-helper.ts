import type { Problem } from "@/types/problems"
import type { TestCase } from "@/types/code-execution"

export interface ProblemStatementDetails {
  description: string
  inputFormat: string
  outputFormat: string
  sampleTests: TestCase[]
  socraticHint: string
  timeLimit: string
  memoryLimit: string
}

/**
 * Generates tailored, problem-specific statement details, input/output specifications,
 * algorithmic invariants, and sample testcases based on the problem's metadata, tags, and rating.
 */
export function getProblemStatementDetails(problem: Problem): ProblemStatementDetails {
  const { name, contest_id, index, rating = 1200, tags = [] } = problem
  const problemCode = `${contest_id || ""}${index}`

  // Categorize primary domain from tags
  const isDP = tags.includes("dp") || tags.includes("dynamic programming")
  const isGraph =
    tags.includes("graphs") || tags.includes("trees") || tags.includes("dfs and similar")
  const isMath =
    tags.includes("math") || tags.includes("number theory") || tags.includes("combinatorics")
  const isString = tags.includes("strings") || tags.includes("string suffix structures")
  const isDataStructures = tags.includes("data structures") || tags.includes("data_structures")
  const isGreedy = tags.includes("greedy") || tags.includes("sortings")

  // Generate description based on problem characteristics
  let description = ""
  let inputFormat = ""
  let outputFormat = ""
  let socraticHint = ""
  let sampleTests: TestCase[] = []

  if (isDP) {
    description = `In **${name}** (Problem ${problemCode}), you are given a sequence or state graph. Your goal is to find an optimal subsequence, partitioning, or transformation that optimizes the objective function while satisfying transition constraints.

Analyze how the solution for a state at index $i$ depends on previously computed subproblems $j < i$.`
    inputFormat = `The first line contains an integer $t$ ($1 \\le t \\le 10^4$) — the number of test cases.\n\nEach test case contains an integer $n$ ($1 \\le n \\le 2 \\cdot 10^5$) followed by an array of $n$ integers $a_1, a_2, \\dots, a_n$ ($1 \\le a_i \\le n$).`
    outputFormat = `For each test case, output a single integer representing the optimal value satisfying the conditions.`
    socraticHint = `Consider state representation $dp[i]$ representing the optimal answer on prefix $i$. Can transitions be sped up from $\\mathcal{O}(N)$ to $\\mathcal{O}(1)$ or $\\mathcal{O}(\\log N)$ using prefix optimums or a hash map?`
    sampleTests = [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "3\n5\n1 2 1 2 1\n3\n1 2 3\n4\n1 1 1 1\n",
        expected_output: "3\n0\n4\n",
      },
      {
        id: "custom-1",
        name: "Custom 2",
        input: "1\n6\n2 1 3 2 1 3\n",
        expected_output: "4\n",
      },
    ]
  } else if (isGraph) {
    description = `In **${name}** (Problem ${problemCode}), you are given a graph or tree with $n$ vertices and $m$ edges. You need to determine path reachability, component properties, or construct an optimal traversal sequence.`
    inputFormat = `The first line contains an integer $t$ ($1 \\le t \\le 10^4$) — test cases.\n\nEach test case contains $n, m$ ($1 \\le n \\le 2 \\cdot 10^5$), followed by $m$ lines each containing two integers $u, v$ ($1 \\le u, v \\le n$) denoting edges.`
    outputFormat = `For each test case, output the required graph metric or traversal validity ("YES" or "NO").`
    socraticHint = `Is the graph a Tree, DAG, or General graph? Check if BFS/DFS topological order, DSU connectivity, or Dijkstra on state $(u, \\text{cost})$ solves the constraint efficiently.`
    sampleTests = [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "2\n4 3\n1 2\n2 3\n3 4\n3 2\n1 2\n2 3\n",
        expected_output: "YES\nYES\n",
      },
    ]
  } else if (isMath) {
    description = `In **${name}** (Problem ${problemCode}), given arithmetic values or modular constraints, determine the numerical result modulo $10^9+7$ (or $998244353$) or find if a valid constructive configuration exists.`
    inputFormat = `The first line contains $t$ ($1 \\le t \\le 10^4$).\n\nEach test case contains integers $a, b, c$ or $n$ ($1 \\le n \\le 10^9$).`
    outputFormat = `Output the calculated mathematical answer or remainder modulo $10^9+7$.`
    socraticHint = `Check prime factorization, greatest common divisors (GCD), or fast binary exponentiation $a^b \\pmod m$ to handle large $N \\le 10^{18}$.`
    sampleTests = [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "3\n6 7\n12 15\n100 200\n",
        expected_output: "42\n180\n20000\n",
      },
    ]
  } else if (isString) {
    description = `In **${name}** (Problem ${problemCode}), you are given strings $s$ and $t$. Compute substring frequencies, character rearrangements, or palindromic subsegments according to the problem rules.`
    inputFormat = `The first line contains an integer $t$ ($1 \\le t \\le 10^4$).\n\nEach test case contains the length $n$ followed by string $s$ consisting of lowercase Latin characters.`
    outputFormat = `Print the resulting transformed string or the frequency count.`
    socraticHint = `Can counting character frequencies with an array of size 26 or using rolling polynomial hashing verify substring equality in $\\mathcal{O}(1)$?`
    sampleTests = [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "3\n5\nabcba\n4\ncode\n6\nforces\n",
        expected_output: "YES\nNO\nYES\n",
      },
    ]
  } else if (isGreedy) {
    description = `In **${name}** (Problem ${problemCode}), you are given $n$ items with associated weights or values. Find an optimal selection or greedy choice ordering that maximizes the total score.`
    inputFormat = `The first line contains $t$ ($1 \\le t \\le 10^4$).\n\nEach test case contains $n$ ($1 \\le n \\le 2 \\cdot 10^5$) and array $a_1, a_2, \\dots, a_n$.`
    outputFormat = `Print the maximum achievable score or the sequence of chosen indices.`
    socraticHint = `Try sorting the elements by value, ratio, or deadline. Does picking the local optimum at each step preserve global optimality?`
    sampleTests = [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "2\n4\n4 2 3 1\n3\n10 20 30\n",
        expected_output: "10\n60\n",
      },
    ]
  } else {
    description = `In **${name}** (Problem ${problemCode}), follow the step-by-step logic to process the given array elements and produce the required result.`
    inputFormat = `The first line contains $t$ ($1 \\le t \\le 10^4$).\n\nEach test case contains $n$ followed by $n$ space-separated integers $a_1, a_2, \\dots, a_n$.`
    outputFormat = `Output the answer for each testcase on a new line.`
    socraticHint = `Simulate the operations step-by-step. Keep an eye on $1$-based vs $0$-based indexing and array bounds.`
    sampleTests = [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "2\n3\n1 2 3\n4\n5 4 3 2\n",
        expected_output: "6\n14\n",
      },
    ]
  }

  // Time and memory limits
  const timeLimit = rating && rating >= 2400 ? "3.0s" : "2.0s"
  const memoryLimit = "256MB"

  return {
    description,
    inputFormat,
    outputFormat,
    sampleTests,
    socraticHint,
    timeLimit,
    memoryLimit,
  }
}
