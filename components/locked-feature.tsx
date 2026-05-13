"use client";

import { Lock, Sparkles } from "lucide-react";

type LockedFeatureProps = {
  description: string;
  onUpgrade: () => void;
  title: string;
};

export function LockedFeature({ description, onUpgrade, title }: LockedFeatureProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-surface/60 p-5 backdrop-blur-md">
      <div className="max-w-sm rounded-[1.5rem] border border-white/[0.55] bg-white/[0.86] p-5 text-center shadow-premium dark:border-white/10 dark:bg-zinc-950/[0.86]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <button className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-premium dark:bg-white dark:text-zinc-950" type="button" onClick={onUpgrade}>
          <Sparkles className="h-4 w-4" />
          Upgrade
        </button>
      </div>
    </div>
  );
}
