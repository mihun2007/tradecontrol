"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./sidebar";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/[0.55] bg-white/[0.45] px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/40 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3 text-sm font-medium ${
                isActive
                  ? "bg-zinc-950 text-white shadow-soft dark:bg-white dark:text-zinc-950"
                  : "border border-line/60 bg-surface/60 text-muted"
              }`}
              href={item.href}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
