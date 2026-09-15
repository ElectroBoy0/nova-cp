import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.snippet import Snippet

logger = logging.getLogger(__name__)

OFFICIAL_SNIPPETS = [
    {
        "title": "C++ Fast I/O Template",
        "description": "Standard boilerplate for C++ competitive programming with fast I/O.",
        "language": "cpp",
        "category": "templates",
        "complexity": "O(1)",
        "usage_notes": "Use this as the starting point for any C++ solution.",
        "code": """#include <bits/stdc++.h>
using namespace std;

#define FAST_IO ios_base::sync_with_stdio(false); cin.tie(NULL);
#define int long long
#define all(v) (v).begin(), (v).end()
#define pb push_back

void solve() {
    
  //write your code here baby
  
}

int32_t main() {
    FAST_IO;
    int t;
    cin >> t;
    while (t--) {
        solve();
    }
    return 0;
}"""
    },
    {
        "title": "Disjoint Set Union (DSU)",
        "description": "Union-Find data structure with path compression and union by rank.",
        "language": "cpp",
        "category": "data_structures",
        "complexity": "O(α(n)) per operation",
        "usage_notes": "Initialize with DSU dsu(n).",
        "code": """struct DSU {
    vector<int> parent, rank, size;
    DSU(int n) {
        parent.resize(n);
        rank.assign(n, 0);
        size.assign(n, 1);
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
            if (rank[root_i] < rank[root_j])
                swap(root_i, root_j);
            parent[root_j] = root_i;
            size[root_i] += size[root_j];
            if (rank[root_i] == rank[root_j])
                rank[root_i]++;
            return true;
        }
        return false;
    }
};"""
    },
    {
        "title": "Segment Tree (Point Update, Range Query)",
        "description": "A basic segment tree for point updates and range queries.",
        "language": "cpp",
        "category": "data_structures",
        "complexity": "O(log N) query/update, O(N) build",
        "usage_notes": "0-indexed. Modify the `merge` function for operations other than sum.",
        "code": """template<typename T>
struct SegmentTree {
    int n;
    vector<T> tree;

    // Identity element and merge function
    const T ID = 0;
    T merge(T a, T b) { return a + b; }

    SegmentTree(int n) : n(n) {
        tree.assign(2 * n, ID);
    }

    void build(const vector<T>& a) {
        for (int i = 0; i < n; i++) tree[n + i] = a[i];
        for (int i = n - 1; i > 0; i--)
            tree[i] = merge(tree[i<<1], tree[i<<1|1]);
    }

    void update(int pos, T val) {
        for (tree[pos += n] = val; pos > 1; pos >>= 1)
            tree[pos>>1] = merge(tree[pos], tree[pos^1]);
    }

    T query(int l, int r) {
        T resL = ID, resR = ID;
        for (l += n, r += n + 1; l < r; l >>= 1, r >>= 1) {
            if (l & 1) resL = merge(resL, tree[l++]);
            if (r & 1) resR = merge(tree[--r], resR);
        }
        return merge(resL, resR);
    }
};"""
    },
    {
        "title": "Fenwick Tree (Binary Indexed Tree)",
        "description": "Computes prefix sums and updates elements.",
        "language": "cpp",
        "category": "data_structures",
        "complexity": "O(log N) query/update",
        "usage_notes": "1-indexed internally, but interface is 0-indexed.",
        "code": """struct FenwickTree {
    vector<long long> bit;
    int n;

    FenwickTree(int n) {
        this->n = n;
        bit.assign(n + 1, 0);
    }

    void add(int idx, long long delta) {
        for (++idx; idx <= n; idx += idx & -idx)
            bit[idx] += delta;
    }

    long long sum(int idx) {
        long long ret = 0;
        for (++idx; idx > 0; idx -= idx & -idx)
            ret += bit[idx];
        return ret;
    }

    long long sum(int l, int r) {
        return sum(r) - sum(l - 1);
    }
};"""
    },
    {
        "title": "Binary Exponentiation",
        "description": "Computes (a^b) % m efficiently.",
        "language": "cpp",
        "category": "math",
        "complexity": "O(log B)",
        "usage_notes": "",
        "code": """long long binpow(long long a, long long b, long long m) {
    a %= m;
    long long res = 1;
    while (b > 0) {
        if (b & 1) res = res * a % m;
        a = a * a % m;
        b >>= 1;
    }
    return res;
}"""
    },
    {
        "title": "Sieve of Eratosthenes",
        "description": "Finds all primes up to N and Smallest Prime Factor (SPF).",
        "language": "cpp",
        "category": "math",
        "complexity": "O(N log log N)",
        "usage_notes": "Useful for fast prime factorization of multiple numbers.",
        "code": """const int MAXN = 1000005;
vector<int> spf(MAXN);
vector<int> primes;

void sieve() {
    for (int i = 2; i < MAXN; i++) spf[i] = i;
    for (int i = 2; i * i < MAXN; i++) {
        if (spf[i] == i) {
            for (int j = i * i; j < MAXN; j += i)
                if (spf[j] == j)
                    spf[j] = i;
        }
    }
    for (int i = 2; i < MAXN; i++) {
        if (spf[i] == i) primes.push_back(i);
    }
}

vector<int> get_factorization(int x) {
    vector<int> ret;
    while (x != 1) {
        ret.push_back(spf[x]);
        x = x / spf[x];
    }
    return ret;
}"""
    },
    {
        "title": "Dijkstra's Algorithm",
        "description": "Finds the shortest paths from a single source to all other vertices.",
        "language": "cpp",
        "category": "graphs",
        "complexity": "O(E log V)",
        "usage_notes": "Assumes non-negative edge weights.",
        "code": """const long long INF = 1e18;

vector<long long> dijkstra(int source, int n, const vector<vector<pair<int, long long>>>& adj) {
    vector<long long> dist(n, INF);
    dist[source] = 0;

    // min-heap: {distance, node}
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    pq.push({0, source});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();

        if (d > dist[u]) continue;

        for (auto edge : adj[u]) {
            int v = edge.first;
            long long weight = edge.second;

            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}"""
    },
    {
        "title": "Topological Sort (Kahn's Algorithm)",
        "description": "Finds a topological ordering of a Directed Acyclic Graph (DAG).",
        "language": "cpp",
        "category": "graphs",
        "complexity": "O(V + E)",
        "usage_notes": "Returns an empty vector if the graph contains a cycle.",
        "code": """vector<int> topological_sort(int n, const vector<vector<int>>& adj) {
    vector<int> in_degree(n, 0);
    for (int u = 0; u < n; u++) {
        for (int v : adj[u]) {
            in_degree[v]++;
        }
    }

    queue<int> q;
    for (int i = 0; i < n; i++) {
        if (in_degree[i] == 0) q.push(i);
    }

    vector<int> order;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        order.push_back(u);

        for (int v : adj[u]) {
            if (--in_degree[v] == 0) {
                q.push(v);
            }
        }
    }

    if (order.size() != n) return {}; // Cycle detected
    return order;
}"""
    },
    {
        "title": "Python Fast I/O Template",
        "description": "Standard boilerplate for Python competitive programming.",
        "language": "python",
        "category": "templates",
        "complexity": "O(1)",
        "usage_notes": "Uses sys.stdin.read for fast input.",
        "code": """import sys
import math
from collections import defaultdict, deque

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    t = int(input_data[0])
    idx = 1

    for _ in range(t):
        # Read inputs here
        # n = int(input_data[idx])
        # idx += 1
        pass

if __name__ == '__main__':
    solve()"""
    },
    {
        "title": "Disjoint Set Union (DSU) - Python",
        "description": "Union-Find data structure for Python.",
        "language": "python",
        "category": "data_structures",
        "complexity": "O(α(n))",
        "usage_notes": "",
        "code": """class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.size = [1] * n

    def find(self, i):
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def unite(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                root_i, root_j = root_j, root_i
            self.parent[root_j] = root_i
            self.size[root_i] += self.size[root_j]
            if self.rank[root_i] == self.rank[root_j]:
                self.rank[root_i] += 1
            return True
        return False"""
    },
    {
        "title": "Binary Search Template",
        "description": "A robust binary search template for finding the first/last element satisfying a condition.",
        "language": "python",
        "category": "techniques",
        "complexity": "O(log(R - L))",
        "usage_notes": "Adjust the `check` function based on the problem.",
        "code": """def check(mid):
    # Return True if condition is satisfied
    return True

def binary_search(l, r):
    ans = -1
    while l <= r:
        mid = (l + r) // 2
        if check(mid):
            ans = mid
            # Move left or right depending on whether you want
            # the first or last occurrence.
            # r = mid - 1  # For first occurrence
            l = mid + 1    # For last occurrence
        else:
            # l = mid + 1  # For first occurrence
            r = mid - 1    # For last occurrence
    return ans"""
    }
]

async def seed_official_snippets(db: AsyncSession) -> int:
    """
    Seeds the database with official snippets.
    It checks if a snippet with the same title already exists.
    Returns the number of snippets inserted.
    """
    count = 0
    for snippet_data in OFFICIAL_SNIPPETS:
        # Check if exists
        stmt = select(Snippet).where(
            Snippet.title == snippet_data["title"],
            Snippet.is_official
        )
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            continue

        snippet = Snippet(
            user_id=None,
            is_official=True,
            **snippet_data
        )
        db.add(snippet)
        count += 1

    if count > 0:
        await db.commit()

    logger.info(f"Seeded {count} official snippets.")
    return count
