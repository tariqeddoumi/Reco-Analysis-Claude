"use client";

import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { Clock, RefreshCw, CheckCircle, XCircle, CalendarClock } from "lucide-react";

type FilterTab = "all" | "pending" | "validated" | "rejected";

interface Extension {
  id: string;
  reason: string;
  originalDate: string | null;
  requestedDate: string;
  requestedAt: string;
  statusCode: string;
  recommendation: { code: string; recommendation: string } | null;
  action: { title: string } | null;
  requester: { firstName: string; lastName: string } | null;
  validator: { firstName: string; lastName: string } | null;
  validatedAt: string | null;
  validationComment: string | null;
}

const STATUS_TAB_CODES: Record<FilterTab, string[]> = {
  all: [],
  pending: ["SUBMITTED", "IN_VALIDATION"],
  validated: ["VALIDATED"],
  rejected: ["REJECTED"],
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  IN_VALIDATION: "En validation",
  VALIDATED: "Validé",
  REJECTED: "Rejeté",
  CANCELLED: "Annulé",
};

export default function ExtensionsPage() {
  const [extensions, setExtensions] = React.useState<Extension[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");

  const [showValidateDialog, setShowValidateDialog] = React.useState(false);
  const [validateTarget, setValidateTarget] = React.useState<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);
  const [validateComment, setValidateComment] = React.useState("");
  const [isValidating, setIsValidating] = React.useState(false);

  const fetchExtensions = React.useCallback(() => {
    setIsLoading(true);
    fetch("/api/extensions")
      .then((r) => r.json())
      .then((data) => setExtensions(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    fetchExtensions();
  }, [fetchExtensions]);

  const filteredExtensions = React.useMemo(() => {
    const codes = STATUS_TAB_CODES[activeTab];
    if (!codes.length) return extensions;
    return extensions.filter((e) => codes.includes(e.statusCode));
  }, [extensions, activeTab]);

  async function handleValidate() {
    if (!validateTarget) return;
    setIsValidating(true);
    try {
      const res = await fetch(`/api/extensions/${validateTarget.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: validateTarget.action,
          comment: validateComment,
        }),
      });
      if (res.ok) {
        setShowValidateDialog(false);
        setValidateTarget(null);
        setValidateComment("");
        fetchExtensions();
      }
    } finally {
      setIsValidating(false);
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "pending", label: "En attente" },
    { key: "validated", label: "Validées" },
    { key: "rejected", label: "Rejetées" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Demandes de Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion des demandes de prolongation d&apos;échéance
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span>{extensions.length} demande{extensions.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.key !== "all" && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {STATUS_TAB_CODES[tab.key].length > 0
                    ? extensions.filter((e) =>
                        STATUS_TAB_CODES[tab.key].includes(e.statusCode)
                      ).length
                    : extensions.length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredExtensions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <CalendarClock className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Aucune demande de report</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recommandation / Action
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Échéance actuelle
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nouvelle échéance
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Motif
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Demandeur
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Date demande
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExtensions.map((ext) => (
                  <tr
                    key={ext.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {ext.recommendation ? (
                        <div>
                          <p className="font-mono text-xs font-semibold text-primary">
                            {ext.recommendation.code}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {ext.recommendation.recommendation}
                          </p>
                        </div>
                      ) : ext.action ? (
                        <p className="text-xs">{ext.action.title}</p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(ext.originalDate)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(ext.requestedDate)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={ext.reason}>
                        {ext.reason}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs">
                        {ext.requester
                          ? `${ext.requester.firstName} ${ext.requester.lastName}`
                          : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(ext.requestedAt)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        code={ext.statusCode}
                        label={STATUS_LABELS[ext.statusCode] ?? ext.statusCode}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(ext.statusCode === "SUBMITTED" || ext.statusCode === "IN_VALIDATION") && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600"
                            title="Valider"
                            onClick={() => {
                              setValidateTarget({ id: ext.id, action: "approve" });
                              setShowValidateDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            title="Rejeter"
                            onClick={() => {
                              setValidateTarget({ id: ext.id, action: "reject" });
                              setShowValidateDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {ext.statusCode === "VALIDATED" && ext.validator && (
                        <span className="text-xs text-muted-foreground">
                          Validé par {ext.validator.firstName}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Validate/Reject Dialog */}
      <Dialog open={showValidateDialog} onOpenChange={setShowValidateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {validateTarget?.action === "approve"
                ? "Valider la demande de report"
                : "Rejeter la demande de report"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Commentaire {validateTarget?.action === "reject" ? "(obligatoire)" : "(optionnel)"}</Label>
              <Textarea
                placeholder="Commentaire..."
                value={validateComment}
                onChange={(e) => setValidateComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowValidateDialog(false);
                setValidateTarget(null);
                setValidateComment("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant={validateTarget?.action === "reject" ? "destructive" : "default"}
              onClick={handleValidate}
              disabled={
                isValidating ||
                (validateTarget?.action === "reject" && !validateComment.trim())
              }
            >
              {isValidating
                ? "En cours..."
                : validateTarget?.action === "approve"
                ? "Valider"
                : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
