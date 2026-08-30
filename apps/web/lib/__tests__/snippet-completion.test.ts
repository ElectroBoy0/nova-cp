import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { getAvailableSnippets, DEFAULT_SNIPPETS } from "../default-snippets"
import type { Snippet } from "../../types/snippets"

describe("Competitive Programming Snippet Library", () => {
  test("contains rich built-in CP snippets across essential categories", () => {
    assert.ok(DEFAULT_SNIPPETS.length >= 10)

    const triggers = DEFAULT_SNIPPETS.map((s) => s.trigger)
    assert.ok(triggers.includes("dsu"))
    assert.ok(triggers.includes("segtree"))
    assert.ok(triggers.includes("fenwick"))
    assert.ok(triggers.includes("dijkstra"))
    assert.ok(triggers.includes("sieve"))
    assert.ok(triggers.includes("modint"))
    assert.ok(triggers.includes("binpow"))
    assert.ok(triggers.includes("fastio"))
    assert.ok(triggers.includes("boilerplate"))
  })

  test("filters built-in snippets correctly by language", () => {
    const cppSnippets = getAvailableSnippets("cpp")
    const pythonSnippets = getAvailableSnippets("python")
    const javaSnippets = getAvailableSnippets("java")

    assert.ok(cppSnippets.some((s) => s.trigger === "dsu" && s.code.includes("struct DSU")))
    assert.ok(pythonSnippets.some((s) => s.trigger === "dsu" && s.code.includes("class DSU:")))
    assert.ok(javaSnippets.some((s) => s.trigger === "dsu" && s.code.includes("static class DSU")))
  })

  test("merges and normalizes custom user snippets", () => {
    const customUserSnippets: Snippet[] = [
      {
        id: "snip_1",
        user_id: "user_123",
        title: "Lazy Segment Tree",
        description: "Range update and range query",
        language: "cpp",
        category: "data_structures",
        code: "// Lazy SegTree code here",
        complexity: "O(log N)",
        usage_notes: "Supports range addition and sum query",
        is_official: false,
        is_favorited: true,
        created_at: "2026-08-31T00:00:00Z",
        updated_at: "2026-08-31T00:00:00Z",
      },
      {
        id: "snip_2",
        user_id: "user_123",
        title: "my_debug_macro",
        description: null,
        language: "cpp",
        category: "templates",
        code: '#define dbg(x) cerr << #x << " = " << x << endl;',
        complexity: null,
        usage_notes: null,
        is_official: false,
        is_favorited: false,
        created_at: "2026-08-31T00:00:00Z",
        updated_at: "2026-08-31T00:00:00Z",
      },
    ]

    const merged = getAvailableSnippets("cpp", customUserSnippets)

    // Check that custom snippets are placed at the beginning
    const custom1 = merged.find((s) => s.title === "Lazy Segment Tree")
    assert.ok(custom1)
    assert.equal(custom1.trigger, "lazysegmenttree")
    assert.ok(custom1.aliases.includes("lazy segment tree"))
    assert.ok(custom1.aliases.includes("lst"))
    assert.equal(custom1.isCustom, true)

    const custom2 = merged.find((s) => s.title === "my_debug_macro")
    assert.ok(custom2)
    assert.equal(custom2.trigger, "my_debug_macro")
    assert.equal(custom2.code, '#define dbg(x) cerr << #x << " = " << x << endl;')
  })

  test("handles snippet language matching and universal language fallback", () => {
    const multiLangSnippets: Snippet[] = [
      {
        id: "snip_all",
        user_id: "user_123",
        title: "Header Note",
        description: "Author notes",
        language: "all",
        category: "templates",
        code: "// Solved by NovaCP",
        complexity: null,
        usage_notes: null,
        is_official: false,
        is_favorited: false,
        created_at: "2026-08-31T00:00:00Z",
        updated_at: "2026-08-31T00:00:00Z",
      },
    ]

    const cppMerged = getAvailableSnippets("cpp", multiLangSnippets)
    const pythonMerged = getAvailableSnippets("python", multiLangSnippets)

    assert.ok(cppMerged.some((s) => s.title === "Header Note"))
    assert.ok(pythonMerged.some((s) => s.title === "Header Note"))
  })
})
