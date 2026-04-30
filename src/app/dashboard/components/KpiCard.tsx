"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type KpiColor = "default" | "success" | "warning" | "danger";

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  color?: KpiColor;
  className?: string;
}

const colorVariants: Record<KpiColor, {
  card: string;
  iconWrapper: string;
  value: string;
  trend: string;
}> = {
  default: {
    card: "bg-white border-slate-200",
    iconWrapper: "bg-slate-100 text-slate-600",
    value: "text-slate-900",
    trend: "text-slate-500",
  },
  success: {
    card: "bg-white border-emerald-200",
    iconWrapper: "bg-emerald-50 text-emerald-600",
    value: "text-slate-900",
    trend: "text-emerald-600",
  },
  warning: {
    card: "bg-amber-50 border-amber-200",
    iconWrapper: "bg-amber-100 text-amber-700",
    value: "text-amber-900",
    trend: "text-amber-700",
  },
  danger: {
    card: "bg-red-50 border-red-200",
    iconWrapper: "bg-red-100 text-red-700",
    value: "text-red-900",
    trend: "text-red-700",
  },
};

export function KpiCard({
  title,
  value,
  description,
  icon,
  trend,
  color = "default",
  className,
}: KpiCardProps) {
  const styles = colorVariants[color];

  const TrendIcon =
    trend && trend.value > 0
      ? TrendingUp
      : trend && trend.value < 0
      ? TrendingDown
      : Minus;

  const trendColor =
    trend && trend.value > 0
      ? "text-emerald-600"
      : trend && trend.value < 0
      ? "text-red-600"
      : "text-slate-400";

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-shadow hover:shadow-md",
        styles.card,
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
              {title}
            </p>
            <p className={cn("mt-1.5 text-3xl font-bold leading-none", styles.value)}>
              {value}
            </p>
            {description && (
              <p className="mt-1.5 text-xs text-slate-500 leading-snug">{description}</p>
            )}
            {trend !== undefined && (
              <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", trendColor)}>
                <TrendIcon className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}
                  {trend.label ? ` ${trend.label}` : ""}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "shrink-0 flex items-center justify-center h-11 w-11 rounded-xl",
              styles.iconWrapper
            )}
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
