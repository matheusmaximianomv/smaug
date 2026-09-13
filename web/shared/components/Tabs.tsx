"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "../lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/**
 * Apoiado no Radix Tabs: traz role="tablist"/"tab", aria-selected e navegação por
 * setas, que a versão em botões soltos não tinha.
 */
export function Tabs({ tabs, value, onValueChange, className }: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List className={cn("flex gap-0.5 border-b border-border", className)}>
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <RadixTabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-1.5 border-b-2 -mb-px px-4 py-2.5 text-[13.5px] font-medium transition-colors",
                active
                  ? "border-red text-red"
                  : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    active ? "bg-red-light text-red" : "bg-bg text-text-muted",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </RadixTabs.Trigger>
          );
        })}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}
