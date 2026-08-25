"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  BarChart2,
  Calendar,
  Check,
  Code2,
  GitCompare,
  Layers,
  ListTodo,
  Shield,
  Terminal,
  Trophy,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AppWindowPreview } from "@/components/landing/app-window-preview"

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* ---- Navigation Header ---- */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border/60 bg-background/90 px-6 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group" aria-label="NovaCP Home">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-105 transition-transform">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            NovaCP
          </span>
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline-block">
            / Competitive Programming OS
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground" aria-label="Main navigation">
          {[
            { href: "#plateau", label: "Analysis" },
            { href: "#weaknesses", label: "Topic Mastery" },
            { href: "#practice", label: "Training Routine" },
            { href: "#upsolve", label: "Upsolve Queue" },
            { href: "#tools", label: "Snippets & Rivals" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative py-1 transition-colors hover:text-foreground group"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-200 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hidden sm:block"
          >
            Sign In
          </Link>
          <Button asChild size="sm" className="h-8 text-xs gap-1.5 px-3 font-medium group active:scale-[0.98] transition-transform">
            <Link href="/login">
              Launch App
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ---- Main Content ---- */}
      <main className="flex-1">
        {/* =======================================================
            --- HERO SECTION ---
        ======================================================= */}
        <section className="px-6 pt-20 pb-16 text-center max-w-5xl mx-auto">
          {/* Release Badge */}
          <div className="mb-6 flex justify-center">
            <Link href="/login">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary text-xs px-3.5 py-1 font-medium gap-2 transition-all hover:bg-primary/10 hover:border-primary/50"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                NovaCP 1.0 Live — Codeforces Sync Active
              </Badge>
            </Link>
          </div>

          {/* Core Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.12] mb-6 max-w-4xl mx-auto">
            Know exactly why you&apos;re stuck.
            <br />
            <span className="text-muted-foreground">Know what to do next.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
            NovaCP connects to your Codeforces history, isolates the exact algorithm topics costing you
            rating points in contests, and builds a targeted practice routine to reach the next rank.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="h-10 text-xs font-semibold px-6 gap-2 shadow-sm group active:scale-[0.98] transition-transform">
              <Link href="/login">
                Link Codeforces Handle — Free
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10 text-xs px-5 border-border/80 text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all">
              <Link href="#plateau">
                How It Works
              </Link>
            </Button>
          </div>

          {/* Authentic Codeforces Analysis Application Window */}
          <AppWindowPreview />

          {/* Metrics Band */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-border/60 py-8 text-left font-mono">
            <div>
              <span className="text-xl sm:text-2xl font-bold text-foreground block">10,000+</span>
              <span className="text-xs text-muted-foreground font-sans">Indexed Codeforces Problems</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-foreground block">CF · CC · AC</span>
              <span className="text-xs text-muted-foreground font-sans">Multi-Platform Contest Sync</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-foreground block">&lt; 60 Seconds</span>
              <span className="text-xs text-muted-foreground font-sans">Initial History Import</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-foreground block">100% Free</span>
              <span className="text-xs text-muted-foreground font-sans">No Password or Credentials</span>
            </div>
          </div>
        </section>

        {/* =======================================================
            --- NARRATIVE 01: UNDERSTAND YOUR RATING PLATEAU ---
        ======================================================= */}
        <motion.section
          id="plateau"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="px-6 py-20 border-t border-border/60 max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
                01 / Rating Plateau Forensics
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Random problem solving creates the illusion of progress.
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                When rating stalls at 1400 Pupil, 1600 Specialist, or 1900 Candidate Master, solving random
                problems from the archive rarely moves the needle. Rating plateaus happen because of specific,
                recurring bottlenecks under contest time pressure.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                NovaCP audits your entire contest submission timeline to separate problems you solve effortlessly
                from the exact Div. 2 C, D, or E problems where your accuracy drops.
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-1/60 p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <span className="text-foreground font-bold font-sans">Contest Problem Solve Rates</span>
                <span className="text-muted-foreground text-[11px]">Last 20 Rated Rounds</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded bg-background border border-border/50 hover:border-border/80 transition-colors">
                  <span className="text-muted-foreground">Div. 2 A (800–1000)</span>
                  <span className="text-foreground font-semibold">98% AC · Avg 00:05</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-background border border-border/50 hover:border-border/80 transition-colors">
                  <span className="text-muted-foreground">Div. 2 B (1100–1300)</span>
                  <span className="text-foreground font-semibold">92% AC · Avg 00:16</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-background border border-border/50 hover:border-border/80 transition-colors">
                  <span className="text-muted-foreground">Div. 2 C (1400–1600)</span>
                  <span className="text-foreground font-semibold">74% AC · Avg 00:42</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-primary/5 border border-primary/30">
                  <span className="text-primary font-bold">Div. 2 D (1700–1900)</span>
                  <span className="text-primary font-bold">28% AC · Rating Bottleneck</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* =======================================================
            --- NARRATIVE 02: FIND YOUR WEAKEST ALGORITHMS ---
        ======================================================= */}
        <motion.section
          id="weaknesses"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="px-6 py-20 border-t border-border/60 max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-lg border border-border/70 bg-surface-1/60 p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <span className="text-foreground font-bold font-sans">Algorithm Mastery Scores</span>
                <span className="text-muted-foreground text-[11px]">Submissions Indexed</span>
              </div>
              <div className="space-y-2.5 pt-1">
                {[
                  { tag: "Dynamic Programming", solved: "14 / 42", pct: 33, alert: true },
                  { tag: "Segment Trees & Range Queries", solved: "18 / 38", pct: 47, alert: true },
                  { tag: "Two Pointers & Binary Search", solved: "38 / 52", pct: 73, alert: false },
                  { tag: "Trees, Graphs & DSU", solved: "46 / 54", pct: 85, alert: false },
                  { tag: "Number Theory & Combinatorics", solved: "32 / 45", pct: 71, alert: false },
                ].map((t) => (
                  <div key={t.tag} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground font-sans font-medium">{t.tag}</span>
                      <span className={t.alert ? "text-primary font-bold" : "text-muted-foreground"}>
                        {t.pct}% ({t.solved})
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className={`h-full ${t.alert ? "bg-primary" : "bg-muted-foreground/60"}`}
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
                02 / Algorithmic Deficit Audit
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Know your weakest tags with mathematical precision.
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Rather than guessing whether you need more Graph theory or DP practice, NovaCP measures your real
                accuracy across standard competitive programming tags.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Every submission — accepted, wrong answer, or time limit exceeded — updates your topic mastery profile.
                You always know the single algorithm category with the highest return on practice time.
              </p>
            </div>
          </div>
        </motion.section>

        {/* =======================================================
            --- NARRATIVE 03: PRACTICE WITH TARGETED PROBLEMS ---
        ======================================================= */}
        <motion.section
          id="practice"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="px-6 py-20 border-t border-border/60 max-w-5xl mx-auto"
        >
          <div className="space-y-3 mb-12 text-center max-w-2xl mx-auto">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
              03 / Deliberate Practice Routine
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Stop wasting 15 minutes picking what to solve.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              NovaCP structures your daily problem solving into three focused practice channels calibrated to your exact rating level.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-lg border border-border/70 bg-surface-1/50 p-5 space-y-3 flex flex-col justify-between hover:border-border/90 transition-colors">
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block">
                  Consistency Anchor
                </span>
                <h3 className="text-sm font-bold text-foreground">Daily Target Mission</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A single problem matched to your current rating. Solved daily to maintain problem-solving speed, streak consistency, and pattern recognition.
                </p>
              </div>
              <div className="pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
                Target: Current Rating (e.g. 1700)
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-1/50 p-5 space-y-3 flex flex-col justify-between hover:border-border/90 transition-colors">
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block">
                  Deficit Fixer
                </span>
                <h3 className="text-sm font-bold text-foreground">Skill Builder Practice</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Problems selected strictly from your lowest-accuracy algorithm tags at +100 to +200 rating above your baseline to fix specific weaknesses.
                </p>
              </div>
              <div className="pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
                Target: +100 to +200 (e.g. 1800–1900)
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-1/50 p-5 space-y-3 flex flex-col justify-between hover:border-border/90 transition-colors">
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block">
                  Next Rank Tier
                </span>
                <h3 className="text-sm font-bold text-foreground">Stretch Challenge</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  High-difficulty problems (+200 to +400 rating) that simulate the exact difficulty threshold needed to achieve your next rank promotion.
                </p>
              </div>
              <div className="pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
                Target: +200 to +400 (e.g. 1900–2100)
              </div>
            </div>
          </div>
        </motion.section>

        {/* =======================================================
            --- NARRATIVE 04: AUTOMATED UPSOLVE WORKFLOW ---
        ======================================================= */}
        <motion.section
          id="upsolve"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="px-6 py-20 border-t border-border/60 max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
                04 / Contest Upsolving
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Never lose a missed contest problem.
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Upsolving is the single highest-return activity in competitive programming. If you don&apos;t solve the
                problems you failed in a contest, you are guaranteed to fail them again in the next round.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                NovaCP automatically captures unsolved problems from every rated round you enter and places them into
                an actionable queue with status tracking until solved and verified.
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-1/60 p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <span className="text-foreground font-bold font-sans">Active Upsolve Queue</span>
                <span className="text-primary font-bold">2 Pending · 1 Mastered</span>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded bg-background border border-border/60 flex items-center justify-between hover:border-border/90 transition-colors">
                  <div>
                    <span className="font-bold text-foreground block">1982D · Smithing Skill</span>
                    <span className="text-[10px] text-muted-foreground">CF Round 955 (Div. 2) · 1800</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-2 text-muted-foreground">
                    Not Started
                  </span>
                </div>
                <div className="p-3 rounded bg-background border border-border/60 flex items-center justify-between hover:border-border/90 transition-colors">
                  <div>
                    <span className="font-bold text-foreground block">1980E · Permutation of Rows</span>
                    <span className="text-[10px] text-muted-foreground">CF Round 950 (Div. 3) · 1600</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-2 text-muted-foreground">
                    Attempted (WA test 14)
                  </span>
                </div>
                <div className="p-3 rounded bg-background border border-primary/30 flex items-center justify-between hover:border-primary/50 transition-colors">
                  <div>
                    <span className="font-bold text-foreground block">1978C · Manhattan Permutations</span>
                    <span className="text-[10px] text-muted-foreground">CF Round 948 (Div. 2) · 1400</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20">
                    Solved &amp; Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* =======================================================
            --- SECTION 05: DEVELOPER TOOLKIT ---
        ======================================================= */}
        <motion.section
          id="tools"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="px-6 py-20 border-t border-border/60 max-w-5xl mx-auto"
        >
          <div className="space-y-3 mb-12 text-center max-w-2xl mx-auto">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
              Developer Arsenal
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for speed in live rounds
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              All the utility tools competitive programmers need in one distraction-free interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-lg border border-border/70 bg-surface-1/50 p-5 space-y-2.5 hover:border-border/90 transition-colors">
              <div className="h-8 w-8 rounded bg-surface-2 border border-border/60 flex items-center justify-center text-primary mb-2">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Algorithmic Snippet Vault</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Standard templates for DSU, Segment Trees, Binary Lifting, Dijkstra, and Fast I/O in C++, Python, and Java.
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-1/50 p-5 space-y-2.5 hover:border-border/90 transition-colors">
              <div className="h-8 w-8 rounded bg-surface-2 border border-border/60 flex items-center justify-center text-primary mb-2">
                <GitCompare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Rival Head-to-Head</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Benchmark rating race trajectories against peers, compare topic radar charts, and identify gap problems.
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-1/50 p-5 space-y-2.5 hover:border-border/90 transition-colors">
              <div className="h-8 w-8 rounded bg-surface-2 border border-border/60 flex items-center justify-center text-primary mb-2">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Unified Contest Hub</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Live aggregator for Codeforces, CodeChef, and AtCoder with timezone-aligned schedules and lead-time alerts.
              </p>
            </div>
          </div>
        </motion.section>

        {/* =======================================================
            --- CALL TO ACTION ---
        ======================================================= */}
        <section className="px-6 py-20 border-t border-border/60">
          <div className="max-w-2xl mx-auto text-center rounded-xl border border-border/80 bg-surface-1/60 p-8 sm:p-12 space-y-5 shadow-xl shadow-black/40">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ready to break your rating plateau?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Link your Codeforces handle in under 60 seconds. Free to use with zero password or credential requirements.
            </p>
            <div className="pt-2">
              <Button asChild size="lg" className="h-10 text-xs font-semibold px-7 gap-2 group active:scale-[0.98] transition-transform">
                <Link href="/login">
                  Get Started Free
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ---- Footer ---- */}
      <footer className="border-t border-border/60 px-6 py-8 text-xs text-muted-foreground bg-background">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">NovaCP</span>
            <span className="text-muted-foreground/60">· The Operating System for Competitive Programmers</span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 font-mono text-center sm:text-right">
            Independent educational platform. Not affiliated with Codeforces, AtCoder, or CodeChef. Problem rights belong to original authors.
          </p>
        </div>
      </footer>
    </div>
  )
}
