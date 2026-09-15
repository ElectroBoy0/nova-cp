import type { SupportedLanguage } from "@/types/code-execution"

export const DEFAULT_TEMPLATES: Record<SupportedLanguage, string> = {
  cpp: `#include <bits/stdc++.h>
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
}
`,

  python: `import sys

def solve():
    input = sys.stdin.readline
    line = input().strip()
    if not line:
        return
    
    t = int(line)
    for _ in range(t):
        n = int(input().strip())
        a = list(map(int, input().split()))
        
        # Write your solution here
        print(n)

if __name__ == "__main__":
    solve()
`,

  java: `import java.io.*;
import java.util.*;

public class Main {
    static class FastScanner {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer("");

        String next() {
            while (!st.hasMoreTokens()) {
                try {
                    String line = br.readLine();
                    if (line == null) return null;
                    st = new StringTokenizer(line);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            return st.nextToken();
        }

        int nextInt() {
            String s = next();
            return s == null ? 0 : Integer.parseInt(s);
        }

        long nextLong() {
            String s = next();
            return s == null ? 0L : Long.parseLong(s);
        }
    }

    public static void main(String[] args) {
        FastScanner fs = new FastScanner();
        PrintWriter out = new PrintWriter(System.out);

        String tStr = fs.next();
        if (tStr != null) {
            int t = Integer.parseInt(tStr);
            while (t-- > 0) {
                int n = fs.nextInt();
                // Write your solution here
                out.println(n);
            }
        }
        out.flush();
    }
}
`,
}

export const LANGUAGE_OPTIONS: {
  value: SupportedLanguage
  label: string
  monacoLang: string
  ext: string
}[] = [
  { value: "cpp", label: "C++ (C++20)", monacoLang: "cpp", ext: "cpp" },
  { value: "python", label: "Python (3.12)", monacoLang: "python", ext: "py" },
  { value: "java", label: "Java (OpenJDK 17)", monacoLang: "java", ext: "java" },
]

/**
 * Detects whether the saved code is the legacy initial boilerplate
 * (which had `vector<int> a(n)` and `cout << n << "\\n"`), so it can be cleanly
 * auto-upgraded to the new default template without overwriting custom user code.
 */
export function isLegacyDefaultTemplate(code: string, language: SupportedLanguage): boolean {
  if (language === "cpp") {
    return (
      code.includes("vector<int> a(n);") &&
      code.includes("// Write your solution here")
    )
  }
  return false
}

