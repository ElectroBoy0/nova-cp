"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, Sparkles } from "lucide-react"

export function MinimalPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mx-auto mt-12 text-left"
    >
      {/* Sleek Minimal Preview Card (Linear/Raycast aesthetic) */}
      <div className="rounded-xl border border-border/80 bg-surface-1/80 backdrop-blur-sm p-6 space-y-5 shadow-xl shadow-black/40 ring-1 ring-white/[0.04]">
        {/* Card Header: Profile & Rating */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-foreground">@tourist_mind</span>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                Candidate Master
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Codeforces Performance Audit</p>
          </div>
          <div className="text-right font-mono">
            <span className="text-sm font-bold text-foreground">1,742</span>
            <span className="text-[11px] text-muted-foreground block">Rating</span>
          </div>
        </div>

        {/* Weak Topic & Mastery Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Weakest Topic
            </span>
            <span className="text-foreground font-semibold font-mono text-[11px]">
              Dynamic Programming · 34%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "34%" }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>

        {/* AI Explanation Note */}
        <div className="rounded-lg bg-surface-2/60 border border-border/50 p-3 text-xs leading-relaxed text-muted-foreground space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-medium text-primary">
            <Sparkles className="w-3 h-3" />
            AI Diagnostic
          </div>
          <p className="text-[11px] text-foreground/90">
            Accuracy drops to 31% on DP transitions above 1700 rating. Practicing interval state optimizations will yield the fastest rating gain.
          </p>
        </div>

        {/* Today's Recommended Problem */}
        <div className="pt-1">
          <div className="text-[11px] font-medium text-muted-foreground mb-2">Today&apos;s Recommended Practice</div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background hover:border-primary/40 transition-colors">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">1842C · Tenzing and Balls</span>
                <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                  1800
                </span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground">dp · data structures</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
