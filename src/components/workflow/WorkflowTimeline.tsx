"use client";

import * as React from "react";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { ArrowRight, MessageSquare, User } from "lucide-react";

interface HistoryEntry {
  id?: string;
  fromStatus?: { code: string; label: string; color?: string | null } | null;
  toStatus: { code: string; label: string; color?: string | null };
  changedBy?: { firstName: string; lastName: string } | null;
  createdAt: string | Date;
  comment?: string | null;
  action?: string | null;
}

interface WorkflowTimelineProps {
  history: HistoryEntry[];
  className?: string;
}

export function WorkflowTimeline({ history, className }: WorkflowTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-3">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ol className="relative border-l border-border ml-4 space-y-0">
        {history.map((entry, index) => (
          <li key={entry.id ?? index} className="mb-6 ml-6">
            {/* Timeline dot */}
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-primary shadow-sm">
              <span className="h-2 w-2 rounded-full bg-primary" />
            </span>

            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              {/* Status transition */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {entry.fromStatus && (
                  <>
                    <StatusBadge
                      code={entry.fromStatus.code}
                      label={entry.fromStatus.label}
                      color={entry.fromStatus.color}
                    />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </>
                )}
                <StatusBadge
                  code={entry.toStatus.code}
                  label={entry.toStatus.label}
                  color={entry.toStatus.color}
                />
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {entry.changedBy && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {entry.changedBy.firstName} {entry.changedBy.lastName}
                  </span>
                )}
                <span className="text-muted-foreground/70">
                  {formatDateTime(entry.createdAt)}
                </span>
                {entry.action && (
                  <span className="font-medium text-foreground/70">
                    {entry.action}
                  </span>
                )}
              </div>

              {/* Comment */}
              {entry.comment && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 p-2.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {entry.comment}
                  </p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
