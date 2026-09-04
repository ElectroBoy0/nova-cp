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

const CURATED_PROBLEMS: Record<string, Partial<ProblemStatementDetails>> = {
  "166A": {
    description: `Another Codeforces Round has just finished! It has gathered $n$ participants, and each of them got a certain score, resulting in a ranking table.

Each participant has solved a certain number of problems and accumulated a certain penalty time.
A participant $A$ is ranked higher than participant $B$ if:
1. Participant $A$ solved strictly more problems than participant $B$;
2. Or they solved the same number of problems, but participant $A$ has strictly less penalty time.

If two participants solved the same number of problems and accumulated the same penalty time, they share the same rank.

You are given the results of all $n$ participants and an integer $k$. Find how many participants share the same rank as the participant in the $k$-th position of the sorted rank list.`,
    inputFormat: `The first line contains two integers $n$ and $k$ ($1 \\le k \\le n \\le 50$) — the number of participants and the target rank.

The next $n$ lines contain two integers each: $p_i$ ($0 \\le p_i \\le 50$) — number of problems solved by the $i$-th participant, and $t_i$ ($0 \\le t_i \\le 1000$) — penalty time of the $i$-th participant.`,
    outputFormat: `Print a single integer — the number of participants that got the same rank as the participant at the $k$-th place.`,
    socraticHint: `Sort the participants in descending order by problems solved ($p_i$), and in ascending order by penalty time ($t_i$) on ties. The $k$-th participant is at 0-indexed position $k-1$. Count how many participants in the sorted list have identical $(p_i, t_i)$.`,
    sampleTests: [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "7 2\n4 10\n4 10\n4 10\n3 20\n2 1\n2 1\n1 10\n",
        expected_output: "3\n",
      },
      {
        id: "sample-2",
        name: "Sample 2",
        input: "11 6\n3 15\n4 20\n4 20\n4 20\n3 15\n3 15\n2 10\n2 10\n2 10\n1 1\n1 1\n",
        expected_output: "2\n",
      },
    ],
    timeLimit: "2.0s",
    memoryLimit: "256MB",
  },
  "4A": {
    description: `One hot summer day Pete and his friend Billy decided to buy a watermelon. They chose the biggest and the ripest one, in their opinion. After that the watermelon was weighed, and the scales showed $w$ kilos. They rushed home, dying of thirst, and decided to divide the berry, however they faced a hard problem.

Pete and Billy are great fans of even numbers, that's why they want to divide the watermelon in such a way that each of the two parts weighs even number of kilos, at the same time it is not obligatory that the parts are equal. The boys are extremely tired and want to start their meal as soon as possible, that's why you should help them and find out, if they can divide the watermelon in the way they want. For sure, each of them should get a part of positive weight.`,
    inputFormat: `The first (and the only) input line contains integer number $w$ ($1 \\le w \\le 100$) — the weight of the watermelon bought by the boys.`,
    outputFormat: `Print \`YES\`, if the boys can divide the watermelon into two parts, each of them weighing even number of kilos; and \`NO\` in the opposite case.`,
    socraticHint: `Can an odd number be represented as the sum of two positive even integers? What is the smallest positive even number that can be split into two even positive parts?`,
    sampleTests: [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "8\n",
        expected_output: "YES\n",
      },
    ],
    timeLimit: "1.0s",
    memoryLimit: "64MB",
  },
  "71A": {
    description: `Sometimes some words like "localization" or "internationalization" are so long that writing them many times in one text is quite tiresome.

Let's consider a word too long, if its length is strictly more than 10 characters. All too long words should be replaced with a special abbreviation.

This abbreviation is made like this: we write down the first and the last letter of a word and between them we write the number of letters between the first and the last letters. That number is in decimal system and doesn't contain any leading zeroes.

Thus, "localization" will be spelt as "l10n", and "internationalization" will be spelt as "i18n".

You are suggested to automatize the process of changing the words with abbreviations. At that all too long words should be replaced by the abbreviation and the words that are not too long should not undergo any changes.`,
    inputFormat: `The first line contains an integer $n$ ($1 \\le n \\le 100$). Each of the following $n$ lines contains one word. All the words consist of lowercase Latin letters and possess the lengths of from 1 to 100 characters.`,
    outputFormat: `Print $n$ lines. The $i$-th line should contain the result of replacing of the $i$-th word from the input data.`,
    socraticHint: `Check if word length $> 10$. If so, print \`\${word[0]}\${length - 2}\${word[length - 1]}\`. Otherwise, print the word as is.`,
    sampleTests: [
      {
        id: "sample-1",
        name: "Sample 1",
        input: "4\nword\nlocalization\ninternationalization\npneumonoultramicroscopicsilicovolcanoconiosis\n",
        expected_output: "word\nl10n\ni18n\np43s\n",
      },
    ],
    timeLimit: "1.0s",
    memoryLimit: "256MB",
  },
}

/**
 * Generates tailored, problem-specific statement details, input/output specifications,
 * algorithmic invariants, and sample testcases based on the problem's metadata, tags, and rating.
 */
export function getProblemStatementDetails(problem: Problem): ProblemStatementDetails {
  const { name, contest_id, index, rating = 1200, tags = [] } = problem
  const problemCode = `${contest_id || ""}${index}`.toUpperCase()

  if (CURATED_PROBLEMS[problemCode]) {
    const curated = CURATED_PROBLEMS[problemCode]
    return {
      description: curated.description || "",
      inputFormat: curated.inputFormat || "",
      outputFormat: curated.outputFormat || "",
      sampleTests: curated.sampleTests || [],
      socraticHint: curated.socraticHint || "",
      timeLimit: curated.timeLimit || "2.0s",
      memoryLimit: curated.memoryLimit || "256MB",
    }
  }

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
