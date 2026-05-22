import { Flame, Trophy } from "lucide-react";
import type { DisciplineStreakStats } from "@/lib/discipline-streak";

type DisciplineStreakCardProps = {
  mode?: "dark" | "surface";
  stats: DisciplineStreakStats;
};

export function DisciplineStreakCard({ mode = "surface", stats }: DisciplineStreakCardProps) {
  const isHot = stats.currentStreak >= 5;
  const isDark = mode === "dark";
  const subtitle =
    stats.currentStreak === 0
      ? "Start your streak today"
      : `${stats.currentStreak} clean trading ${stats.currentStreak === 1 ? "day" : "days"} in a row`;

  return (
    <article className={`rounded-[1.5rem] border p-5 shadow-soft backdrop-blur-2xl ${isHot ? "border-amber-300/70 bg-amber-300/[0.12]" : isDark ? "border-white/10 bg-white/[0.075]" : "border-white/[0.55] bg-white/[0.72] dark:border-white/10 dark:bg-white/[0.055]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${isDark ? "text-white/[0.55]" : "text-muted"}`}>Rule Discipline Streak</p>
          <p className={`mt-3 flex items-end gap-2 text-3xl font-semibold tracking-normal ${isDark ? "text-white" : "text-ink"}`}>
            <span>{stats.currentStreak}</span>
            <span className={`pb-1 text-sm font-semibold ${isDark ? "text-white/55" : "text-muted"}`}>{stats.currentStreak === 1 ? "day" : "days"}</span>
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isHot ? "bg-amber-300 text-zinc-950" : isDark ? "bg-white/10 text-amber-300" : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"}`}>
          <Flame className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className={`text-sm font-medium ${isDark ? "text-white/55" : "text-muted"}`}>{subtitle}</p>
        {stats.isPersonalRecord ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-300/20 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-200">
            <Trophy className="h-3.5 w-3.5" />
            Best streak
          </span>
        ) : null}
      </div>
    </article>
  );
}
