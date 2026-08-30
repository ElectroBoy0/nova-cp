import type { Snippet } from "@/types/snippets"

export interface SnippetDefinition {
  title: string
  trigger: string
  aliases?: string[]
  description: string
  category: "data_structures" | "graphs" | "math" | "templates" | "techniques"
  language: "cpp" | "python" | "java"
  code: string
}

export const DEFAULT_SNIPPETS: SnippetDefinition[] = [
  // ========================== C++ SNIPPETS ==========================
  {
    title: "Disjoint Set Union (DSU)",
    trigger: "dsu",
    aliases: ["unionfind", "uf", "disjointset"],
    description: "DSU with path compression and union by size/rank",
    category: "data_structures",
    language: "cpp",
    code: `struct DSU {
    int n;
    vector<int> parent, sz;
    DSU(int n) : n(n), parent(n + 1), sz(n + 1, 1) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int i) {
        if (parent[i] == i)
            return i;
        return parent[i] = find(parent[i]);
    }
    bool unite(int i, int j) {
        int root_i = find(i);
        int root_j = find(j);
        if (root_i != root_j) {
            if (sz[root_i] < sz[root_j])
                swap(root_i, root_j);
            parent[root_j] = root_i;
            sz[root_i] += sz[root_j];
            return true;
        }
        return false;
    }
    bool same(int i, int j) {
        return find(i) == find(j);
    }
    int size(int i) {
        return sz[find(i)];
    }
};`,
  },
  {
    title: "Segment Tree (Point Update, Range Query)",
    trigger: "segtree",
    aliases: ["segmenttree", "st"],
    description: "Iterative Segment Tree for point update and range query",
    category: "data_structures",
    language: "cpp",
    code: `template <typename T>
struct SegTree {
    int n;
    vector<T> tree;
    T neutral;
    function<T(T, T)> merge;

    SegTree(int n, T neutral = 0, function<T(T, T)> merge = [](T a, T b) { return a + b; })
        : n(n), neutral(neutral), merge(merge) {
        tree.assign(2 * n, neutral);
    }

    void update(int pos, T val) {
        for (tree[pos += n] = val; pos > 1; pos >>= 1) {
            tree[pos >> 1] = merge(tree[pos], tree[pos ^ 1]);
        }
    }

    T query(int l, int r) { // [l, r]
        T res_l = neutral, res_r = neutral;
        for (l += n, r += n + 1; l < r; l >>= 1, r >>= 1) {
            if (l & 1) res_l = merge(res_l, tree[l++]);
            if (r & 1) res_r = merge(tree[--r], res_r);
        }
        return merge(res_l, res_r);
    }
};`,
  },
  {
    title: "Binary Indexed Tree / Fenwick Tree",
    trigger: "fenwick",
    aliases: ["bit", "fenwicktree"],
    description: "1D Fenwick Tree for point updates and prefix sums (1-indexed)",
    category: "data_structures",
    language: "cpp",
    code: `template <typename T = long long>
struct Fenwick {
    int n;
    vector<T> tree;
    Fenwick(int n) : n(n), tree(n + 1, 0) {}
    void add(int i, T delta) {
        for (; i <= n; i += i & -i) tree[i] += delta;
    }
    T query(int i) {
        T sum = 0;
        for (; i > 0; i -= i & -i) sum += tree[i];
        return sum;
    }
    T query(int l, int r) {
        return query(r) - query(l - 1);
    }
};`,
  },
  {
    title: "Dijkstra Shortest Path",
    trigger: "dijkstra",
    aliases: ["shortestpath", "sssp"],
    description: "Dijkstra algorithm using priority queue for weighted graphs",
    category: "graphs",
    language: "cpp",
    code: `const long long INF = 1e18;

vector<long long> dijkstra(int start_node, int n, const vector<vector<pair<int, long long>>>& adj) {
    vector<long long> dist(n + 1, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;

    dist[start_node] = 0;
    pq.push({0, start_node});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();

        if (d > dist[u]) continue;

        for (const auto& [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}`,
  },
  {
    title: "Linear Sieve & Prime Factorization",
    trigger: "sieve",
    aliases: ["primes", "linear_sieve", "spf"],
    description: "Linear sieve computing Smallest Prime Factor (SPF) and primes in O(N)",
    category: "math",
    language: "cpp",
    code: `vector<int> primes;
vector<int> spf; // smallest prime factor

void linear_sieve(int MAXN) {
    spf.assign(MAXN + 1, 0);
    for (int i = 2; i <= MAXN; ++i) {
        if (spf[i] == 0) {
            spf[i] = i;
            primes.push_back(i);
        }
        for (int p : primes) {
            if (p > spf[i] || i * p > MAXN) break;
            spf[i * p] = p;
        }
    }
}

vector<pair<int, int>> get_factors(int x) {
    vector<pair<int, int>> factors;
    while (x > 1) {
        int p = spf[x], count = 0;
        while (x % p == 0) {
            count++;
            x /= p;
        }
        factors.push_back({p, count});
    }
    return factors;
}`,
  },
  {
    title: "Modular Arithmetic Struct (Mint)",
    trigger: "modint",
    aliases: ["mint", "modulo"],
    description: "ModInt struct with operator overloading and modular inverse (1e9+7 or 998244353)",
    category: "math",
    language: "cpp",
    code: `template <int MOD = 1'000'000'007>
struct ModInt {
    int v;
    ModInt() : v(0) {}
    ModInt(long long _v) { v = int((-MOD < _v && _v < MOD) ? _v : _v % MOD); if (v < 0) v += MOD; }
    friend bool operator==(const ModInt& a, const ModInt& b) { return a.v == b.v; }
    friend bool operator!=(const ModInt& a, const ModInt& b) { return a.v != b.v; }
    ModInt& operator+=(const ModInt& o) { if ((v += o.v) >= MOD) v -= MOD; return *this; }
    ModInt& operator-=(const ModInt& o) { if ((v -= o.v) < 0) v += MOD; return *this; }
    ModInt& operator*=(const ModInt& o) { v = int(1LL * v * o.v % MOD); return *this; }
    ModInt& operator/=(const ModInt& o) { return (*this) *= o.inv(); }
    ModInt operator-() const { return ModInt(-v); }
    ModInt& operator++() { return *this += 1; }
    ModInt& operator--() { return *this -= 1; }
    friend ModInt operator+(ModInt a, const ModInt& b) { return a += b; }
    friend ModInt operator-(ModInt a, const ModInt& b) { return a -= b; }
    friend ModInt operator*(ModInt a, const ModInt& b) { return a *= b; }
    friend ModInt operator/(ModInt a, const ModInt& b) { return a /= b; }
    ModInt pow(long long p) const {
        ModInt res = 1, a = *this;
        for (; p > 0; p >>= 1, a *= a) if (p & 1) res *= a;
        return res;
    }
    ModInt inv() const { return pow(MOD - 2); }
    friend ostream& operator<<(ostream& os, const ModInt& m) { return os << m.v; }
    friend istream& operator>>(istream& is, ModInt& m) { long long x; is >> x; m = ModInt(x); return is; }
};
using mint = ModInt<1'000'000'007>;`,
  },
  {
    title: "Binary Exponentiation (Fast Power)",
    trigger: "binpow",
    aliases: ["power", "fastpow"],
    description: "Fast modular exponentiation in O(log p)",
    category: "math",
    language: "cpp",
    code: `long long binpow(long long base, long long exp, long long mod = 1e9+7) {
    long long res = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) res = (__int128)res * base % mod;
        base = (__int128)base * base % mod;
        exp >>= 1;
    }
    return res;
}`,
  },
  {
    title: "Combinatorics (nCr, Factorials & Inverses)",
    trigger: "ncr",
    aliases: ["combinations", "choose"],
    description: "O(1) nCr queries after O(N) factorial precomputation",
    category: "math",
    language: "cpp",
    code: `const int MAX_FACT = 1000005;
const int MOD = 1e9 + 7;
long long fact[MAX_FACT], invFact[MAX_FACT];

long long binpow(long long a, long long b) {
    long long res = 1;
    while (b > 0) {
        if (b & 1) res = res * a % MOD;
        a = a * a % MOD;
        b >>= 1;
    }
    return res;
}

void precompute_ncr() {
    fact[0] = 1;
    invFact[0] = 1;
    for (int i = 1; i < MAX_FACT; i++) {
        fact[i] = (fact[i - 1] * i) % MOD;
    }
    invFact[MAX_FACT - 1] = binpow(fact[MAX_FACT - 1], MOD - 2);
    for (int i = MAX_FACT - 2; i >= 1; i--) {
        invFact[i] = (invFact[i + 1] * (i + 1)) % MOD;
    }
}

long long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] * invFact[r] % MOD * invFact[n - r] % MOD;
}`,
  },
  {
    title: "Fast I/O Setup",
    trigger: "fastio",
    aliases: ["io", "cin"],
    description: "Fast standard I/O for C++",
    category: "templates",
    language: "cpp",
    code: `ios_base::sync_with_stdio(false);
cin.tie(NULL);`,
  },
  {
    title: "CP Competitive Programming Boilerplate",
    trigger: "boilerplate",
    aliases: ["template", "cp"],
    description: "Standard competitive programming template with testcases loop",
    category: "templates",
    language: "cpp",
    code: `#include <bits/stdc++.h>
using namespace std;

void solve() {
    $0
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t = 1;
    cin >> t;
    while (t--) {
        solve();
    }
    return 0;
}`,
  },

  // ========================== PYTHON SNIPPETS ==========================
  {
    title: "Disjoint Set Union (DSU)",
    trigger: "dsu",
    aliases: ["unionfind", "uf"],
    description: "Python DSU with path compression and union by rank",
    category: "data_structures",
    language: "python",
    code: `class DSU:
    def __init__(self, n: int):
        self.parent = list(range(n + 1))
        self.size = [1] * (n + 1)

    def find(self, i: int) -> int:
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def unite(self, i: int, j: int) -> bool:
        root_i, root_j = self.find(i), self.find(j)
        if root_i != root_j:
            if self.size[root_i] < self.size[root_j]:
                root_i, root_j = root_j, root_i
            self.parent[root_j] = root_i
            self.size[root_i] += self.size[root_j]
            return True
        return False

    def same(self, i: int, j: int) -> bool:
        return self.find(i) == self.find(j)`,
  },
  {
    title: "Segment Tree (Range Sum Query)",
    trigger: "segtree",
    aliases: ["segmenttree"],
    description: "Iterative Segment Tree in Python",
    category: "data_structures",
    language: "python",
    code: `class SegTree:
    def __init__(self, n: int, neutral=0, merge=lambda a, b: a + b):
        self.n = n
        self.neutral = neutral
        self.merge = merge
        self.tree = [neutral] * (2 * n)

    def update(self, pos: int, val: int):
        pos += self.n
        self.tree[pos] = val
        while pos > 1:
            self.tree[pos >> 1] = self.merge(self.tree[pos], self.tree[pos ^ 1])
            pos >>= 1

    def query(self, l: int, r: int):  # [l, r]
        res_l, res_r = self.neutral, self.neutral
        l += self.n
        r += self.n + 1
        while l < r:
            if l & 1:
                res_l = self.merge(res_l, self.tree[l])
                l += 1
            if r & 1:
                r -= 1
                res_r = self.merge(self.tree[r], res_r)
            l >>= 1
            r >>= 1
        return self.merge(res_l, res_r)`,
  },
  {
    title: "Dijkstra Shortest Path",
    trigger: "dijkstra",
    aliases: ["shortestpath"],
    description: "Dijkstra algorithm using heapq in Python",
    category: "graphs",
    language: "python",
    code: `import heapq

def dijkstra(start_node: int, n: int, adj: list) -> list:
    INF = float('inf')
    dist = [INF] * (n + 1)
    dist[start_node] = 0
    pq = [(0, start_node)]

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))
    return dist`,
  },
  {
    title: "Fast I/O & Boilerplate",
    trigger: "fastio",
    aliases: ["boilerplate", "template"],
    description: "Fast I/O and template for Competitive Programming in Python",
    category: "templates",
    language: "python",
    code: `import sys

def solve():
    $0
    pass

def main():
    input = sys.stdin.read
    data = input().split()
    if not data:
        return
    
    # Process test cases
    solve()

if __name__ == '__main__':
    main()`,
  },

  // ========================== JAVA SNIPPETS ==========================
  {
    title: "Disjoint Set Union (DSU)",
    trigger: "dsu",
    aliases: ["unionfind"],
    description: "Java DSU with path compression and union by rank",
    category: "data_structures",
    language: "java",
    code: `static class DSU {
    int[] parent, size;
    public DSU(int n) {
        parent = new int[n + 1];
        size = new int[n + 1];
        for (int i = 0; i <= n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
    }
    public int find(int i) {
        if (parent[i] == i) return i;
        return parent[i] = find(parent[i]);
    }
    public boolean unite(int i, int j) {
        int rootI = find(i), rootJ = find(j);
        if (rootI != rootJ) {
            if (size[rootI] < size[rootJ]) {
                int temp = rootI; rootI = rootJ; rootJ = temp;
            }
            parent[rootJ] = rootI;
            size[rootI] += size[rootJ];
            return true;
        }
        return false;
    }
}`,
  },
  {
    title: "FastScanner & CP Boilerplate",
    trigger: "boilerplate",
    aliases: ["fastio", "template"],
    description: "Fast I/O template for Java competitive programming",
    category: "templates",
    language: "java",
    code: `import java.io.*;
import java.util.*;

public class Main {
    static class FastScanner {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer("");
        String next() {
            while (!st.hasMoreTokens()) {
                try { st = new StringTokenizer(br.readLine()); }
                catch (IOException e) { e.printStackTrace(); }
            }
            return st.nextToken();
        }
        int nextInt() { return Integer.parseInt(next()); }
        long nextLong() { return Long.parseLong(next()); }
    }

    public static void main(String[] args) {
        FastScanner fs = new FastScanner();
        PrintWriter out = new PrintWriter(System.out);

        int t = fs.nextInt();
        while (t-- > 0) {
            $0
        }

        out.flush();
    }
}`,
  },
]

/**
 * Get all available snippets (built-in + user custom) matching the current language
 */
export function getAvailableSnippets(
  language: string,
  userSnippets: Snippet[] = []
): Array<{
  title: string
  trigger: string
  aliases: string[]
  description: string
  category: string
  code: string
  isCustom?: boolean
}> {
  const normLang = language.toLowerCase()

  // 1. Filter built-in snippets
  const builtIns = DEFAULT_SNIPPETS.filter((s) => s.language === normLang).map((s) => ({
    title: s.title,
    trigger: s.trigger,
    aliases: s.aliases || [],
    description: s.description,
    category: s.category,
    code: s.code,
    isCustom: false,
  }))

  // 2. Map custom user snippets
  const custom = userSnippets
    .filter((s) => !s.language || s.language.toLowerCase() === normLang || s.language === "all")
    .map((s) => {
      const cleanTitle = s.title.trim()
      // Generate clean trigger slug from title (e.g. "My Segment Tree" -> "mysegtree", "dsu_v2")
      const trigger = cleanTitle
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 30)

      const words = cleanTitle.toLowerCase().split(/\s+/)
      const initials = words.map((w) => w[0]).join("")

      return {
        title: s.title,
        trigger: trigger || cleanTitle.toLowerCase(),
        aliases: [cleanTitle.toLowerCase(), initials].filter(Boolean),
        description: s.description || s.usage_notes || `Custom snippet: ${s.title}`,
        category: s.category || "custom",
        code: s.code,
        isCustom: true,
      }
    })

  return [...custom, ...builtIns]
}
