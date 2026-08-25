"use client"

import * as React from "react"
import type { RatingHistoryPoint } from "@/lib/compare"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

interface RatingRaceProps {
  history: RatingHistoryPoint[]
  userHandle: string
  rivalHandle: string
}

export function RatingRace({ history, userHandle, rivalHandle }: RatingRaceProps) {
  if (!history || history.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">No rating history available.</p>
      </div>
    )
  }

  const formatUnixDate = (unixTime: number) => {
    return new Date(unixTime * 1000).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as RatingHistoryPoint
      return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-md">
          <p className="mb-2 font-medium text-foreground">{formatUnixDate(data.time)}</p>
          <div className="space-y-1 text-sm">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}:</span>
                </div>
                <span className="font-semibold text-foreground">{entry.value}</span>
              </div>
            ))}
          </div>
          {data.contest_name && (
            <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2 max-w-[200px] truncate">
              {data.contest_name}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Rating Race</h3>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={history}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="time" 
              tickFormatter={formatUnixDate}
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              domain={['auto', 'auto']}
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Line
              type="monotone"
              dataKey="user_rating"
              name={userHandle}
              stroke="#10b981" // emerald-500
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#10b981" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="rival_rating"
              name={rivalHandle}
              stroke="#6366f1" // indigo-500
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#6366f1" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
