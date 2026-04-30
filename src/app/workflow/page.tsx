"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, FileCheck, GitMerge, AlertTriangle, ArrowRight } from "lucide-react";

interface WorkflowItem {
  id: string;
  code?: string;
  title?: string;
  recommendation?: string;
  entity?: { label: string };
  source?: { label: string };
  status?: { code: string; label: string };
  statusCode?: string;
  depositor?: { firstName: string; lastName: string };
  requester?: { firstName: string; lastName: string };
  requestedDueDate?: string;
  currentDueDate?: string;
  reason?: string;
  initialDueDate?: string;
  progressRate?: number;
}

interface WorkflowSection {
  key: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: WorkflowItem[];
  loading: boolean;
}

export default function WorkflowPage() {
  const [sections, setSections] = useState<WorkflowSection[]>([
    { key: "plans", title: "Plans d'action à valider", icon: <GitMerge className="h-4 w-4" />, color: "blue", items: [], loading: true },
    { key: "evidences", title: "Preuves en révision", icon: <FileCheck className="h-4 w-4" />, color: "purple", items: [], loading: true },
    { key: "closures", title: "Clôtures à valider", icon: <CheckCircle className="h-4 w-4" />, color: "green", items: [], loading: true },
    { key: "extensions", title: "Reports à valider", icon: <Clock className="h-4 w-4" />, color: "amber", items: [], loading: true },
  ]);

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "validate" | "reject";
    itemId: string;
    section: string;
    endpoint: string;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [plansRes, evidencesRes, closuresRes, extensionsRes] = await Promise.all([
      fetch("/api/recommendations?statusId=PLAN_SUBMITTED&pageSize=20"),
      fetch("/api/evidences?statusCode=IN_REVIEW"),
      fetch("/api/recommendations?statusId=CLOSURE_PROPOSED&pageSize=20"),
      fetch("/api/extensions?statusCode=SUBMITTED"),
    ]);

    const [plans, evidences, closures, extensions] = await Promise.all([
      plansRes.ok ? plansRes.json() : { data: [] },
      evidencesRes.ok ? evidencesRes.json() : [],
      closuresRes.ok ? closuresRes.json() : { data: [] },
      extensionsRes.ok ? extensionsRes.json() : [],
    ]);

    setSections([
      { key: "plans", title: "Plans d'action à valider", icon: <GitMerge className="h-4 w-4" />, color: "blue", items: plans.data || [], loading: false },
      { key: "evidences", title: "Preuves en révision", icon: <FileCheck className="h-4 w-4" />, color: "purple", items: Array.isArray(evidences) ? evidences : [], loading: false },
      { key: "closures", title: "Clôtures à valider", icon: <CheckCircle className="h-4 w-4" />, color: "green", items: closures.data || [], loading: false },
      { key: "extensions", title: "Reports à valider", icon: <Clock className="h-4 w-4" />, color: "amber", items: Array.isArray(extensions) ? extensions : [], loading: false },
    ]);
  }

  const openAction = (type: "validate" | "reject", itemId: string, section: string) => {
    const endpointMap: Record<string, string> = {
      evidences: `/api/evidences/${itemId}/validate`,
      extensions: `/api/extensions/${itemId}/validate`,
      closures: `/api/recommendations/${itemId}/status`,
      plans: `/api/recommendations/${itemId}/status`,
    };
    setComment("");
    setActionDialog({ open: true, type, itemId, section, endpoint: endpointMap[section] });
  };

  const handleAction = async () => {
    if (!actionDialog) return;
    if (actionDialog.type === "reject" && !comment.trim()) {
      setFeedback({ type: "error", msg: "Le commentaire est obligatoire pour un rejet" });
      return;
    }
    setProcessing(true);
    try {
      const payload =
        actionDialog.section === "evidences"
          ? { action: actionDialog.type === "validate" ? "accept" : "reject", comment, reason: comment }
          : actionDialog.section === "extensions"
          ? { action: actionDialog.type === "validate" ? "approve" : "reject", comment }
          : { statusId: actionDialog.type === "validate" ? "CLOSED" : "COMPLEMENT_REQUIRED", comment };

      const res = await fetch(actionDialog.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFeedback({ type: "success", msg: actionDialog.type === "validate" ? "Validé avec succès" : "Rejeté avec succès" });
        setActionDialog(null);
        setTimeout(() => { setFeedback(null); fetchAll(); }, 1500);
      } else {
        const err = await res.json();
        setFeedback({ type: "error", msg: err.error || "Erreur" });
      }
    } finally {
      setProcessing(false);
    }
  };

  const colorMap: Record<string, string> = {
    blue: "border-l-blue-500",
    purple: "border-l-purple-500",
    green: "border-l-emerald-500",
    amber: "border-l-amber-500",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitMerge className="h-6 w-6 text-slate-700" />
            File de Validation
          </h1>
          <p className="text-sm text-slate-500 mt-1">Traitez les éléments en attente de votre validation</p>
        </div>

        {feedback && (
          <Alert variant={feedback.type === "success" ? "default" : "destructive"}>
            <AlertDescription>{feedback.msg}</AlertDescription>
          </Alert>
        )}

        {sections.map((section) => (
          <Card key={section.key} className={`border-l-4 ${colorMap[section.color]}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={`text-${section.color}-600`}>{section.icon}</span>
                {section.title}
                {!section.loading && (
                  <Badge variant={section.items.length > 0 ? "destructive" : "secondary"}>
                    {section.items.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {section.loading ? (
                <div className="p-4 space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : section.items.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
                  Aucun élément en attente
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs uppercase text-slate-500 font-semibold">Référence</TableHead>
                      <TableHead className="text-xs uppercase text-slate-500 font-semibold">Description</TableHead>
                      <TableHead className="text-xs uppercase text-slate-500 font-semibold">Entité</TableHead>
                      <TableHead className="text-xs uppercase text-slate-500 font-semibold">Date</TableHead>
                      <TableHead className="text-xs uppercase text-slate-500 font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-sm text-blue-700 font-medium">
                          {item.code || item.id.substring(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {item.recommendation || item.title || item.reason || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {item.entity?.label || item.depositor ? `${item.depositor?.firstName} ${item.depositor?.lastName}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {formatDate(item.initialDueDate || item.requestedDueDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openAction("validate", item.id, section.key)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => openAction("reject", item.id, section.key)}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {actionDialog && (
        <Dialog open={actionDialog.open} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.type === "validate" ? "Confirmer la validation" : "Motif de rejet"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {actionDialog.type === "reject" && (
                <div>
                  <Label className="text-sm font-medium">
                    Motif <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Saisissez le motif de rejet..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
              {actionDialog.type === "validate" && (
                <div>
                  <Label className="text-sm font-medium">Commentaire (optionnel)</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Commentaire de validation..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
              {feedback?.type === "error" && (
                <Alert variant="destructive"><AlertDescription>{feedback.msg}</AlertDescription></Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>Annuler</Button>
              <Button
                onClick={handleAction}
                disabled={processing}
                variant={actionDialog.type === "reject" ? "destructive" : "default"}
              >
                {processing ? "Traitement..." : actionDialog.type === "validate" ? "Valider" : "Rejeter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
