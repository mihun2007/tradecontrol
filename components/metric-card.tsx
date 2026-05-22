import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone: "profit" | "loss" | "neutral";
  valueClassName?: string;
};

export function MetricCard({ label, value, detail, tone, valueClassName }: MetricCardProps) {
  const Icon = tone === "profit" ? ArrowUpRight : tone === "loss" ? ArrowDownRight : Minus;
  const toneClass =
    tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-white/60";

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.075] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/[0.55]">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-4 text-3xl font-semibold tracking-normal ${valueClassName ?? "text-white"}`}>{value}</p>
      <p className={`mt-2 text-sm ${tone === "neutral" ? "text-white/48" : toneClass}`}>{detail}</p>
    </article>
  );
}
