"use client"

import * as React from "react"
import type { TopicMasteryComparison } from "@/lib/compare"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts"

interface TopicRadarProps {
  data: TopicMasteryComparison[]
  userHandle: string
  rivalHandle: string
}

export function TopicRadar({ data, userHandle, rivalHandle }: TopicRadarProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">No topic data available.</p>
      </div>
    )
  }

  // Format data for Recharts Radar
  const chartData = data.map((d) => ({
    topic: d.topic,
    userWinRate: d.user_attempts > 0 ? (d.user_solved / d.user_attempts) * 100 : 0,
    rivalWinRate: d.rival_attempts > 0 ? (d.rival_solved / d.rival_attempts) * 100 : 0,
    userRaw: `${d.user_solved}/${d.user_attempts}`,
    rivalRaw: `${d.rival_solved}/${d.rival_attempts}`,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-md">
          <p className="mb-2 font-medium text-foreground capitalize">{data.topic}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">{userHandle}:</span>
              </div>
              <span className="font-semibold text-foreground">
                {data.userWinRate.toFixed(0)}% <span className="text-muted-foreground text-xs font-normal">({data.userRaw})</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-muted-foreground">{rivalHandle}:</span>
              </div>
              <span className="font-semibold text-foreground">
                {data.rivalWinRate.toFixed(0)}% <span className="text-muted-foreground text-xs font-normal">({data.rivalRaw})</span>
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Topic Mastery</h3>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis 
              dataKey="topic" 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(val: string) => val.length > 10 ? val.substring(0, 10) + '...' : val}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Radar
              name={userHandle}
              dataKey="userWinRate"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
            />
            <Radar
              name={rivalHandle}
              dataKey="rivalWinRate"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
