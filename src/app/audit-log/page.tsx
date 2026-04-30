"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { Shield, Search, Download, ChevronDown, ChevronRight } from "lucide-react";

interface AuditEntry {
  id: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  module: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  comment: string | null;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  STATUS_CHANGE: "bg-purple-100 text-purple-700",
  LOGIN: "bg-slate-100 text-slate-700",
  EXPORT: "bg-amber-100 text-amber-700",
  VALIDATE: "bg-teal-100 text-teal-700",
  REJECT: "bg-orange-100 text-orange-700",
  CLOSE: "bg-indigo-100 text-indigo-700",
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [filters, setFilters] = useState({
    module: "",
    action: "",
    entityType: "",
    fromDate: "",
    toDate: "",
  });

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (filters.module) params.set("module", filters.module);
    if (filters.action) params.set("action", filters.action);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.fromDate) params.set("fromDate", filters.fromDate);
    if (filters.toDate) params.set("toDate", filters.toDate);

    try {
      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page, filters]);

  const totalPages = Math.ceil(total / 50);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-slate-700" />
              Journal d'Audit
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Traçabilité complète de toutes les actions — {total} événements enregistrés
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Select value={filters.module || "all"} onValueChange={(v) => setFilters((p) => ({ ...p, module: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modules</SelectItem>
                  {["auth", "missions", "recommendations", "actions", "evidences", "workflow", "reports", "admin"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.action || "all"} onValueChange={(v) => setFilters((p) => ({ ...p, action: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "LOGIN", "EXPORT", "VALIDATE", "REJECT", "CLOSE"].map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.entityType || "all"} onValueChange={(v) => setFilters((p) => ({ ...p, entityType: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Entité" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les entités</SelectItem>
                  {["Mission", "Recommendation", "Action", "Evidence", "User", "ParameterSetting"].map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input type="date" value={filters.fromDate} onChange={(e) => setFilters((p) => ({ ...p, fromDate: e.target.value }))} placeholder="Depuis" className="text-sm" />
              <Input type="date" value={filters.toDate} onChange={(e) => setFilters((p) => ({ ...p, toDate: e.target.value }))} placeholder="Jusqu'à" className="text-sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-8" />
                  <TableHead className="text-xs uppercase font-semibold text-slate-600">Date / Heure</TableHead>
                  <TableHead className="text-xs uppercase font-semibold text-slate-600">Utilisateur</TableHead>
                  <TableHead className="text-xs uppercase font-semibold text-slate-600">Module</TableHead>
                  <TableHead className="text-xs uppercase font-semibold text-slate-600">Action</TableHead>
                  <TableHead className="text-xs uppercase font-semibold text-slate-600">Entité</TableHead>
                  <TableHead className="text-xs uppercase font-semibold text-slate-600">IP</TableHead>
                  <TableHead className="text-xs uppercase font-semibold text-slate-600">Commentaire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      Aucun événement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <>
                      <TableRow
                        key={entry.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setExpanded((p) => ({ ...p, [entry.id]: !p[entry.id] }))}
                      >
                        <TableCell>
                          {expanded[entry.id] ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                          {formatDateTime(entry.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : <span className="text-slate-400">Système</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{entry.module}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[entry.action] || "bg-slate-100 text-slate-700"}`}>
                            {entry.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <span className="font-medium">{entry.entityType}</span>
                          <span className="text-slate-400 ml-1 font-mono">{entry.entityId.substring(0, 8)}…</span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-400">{entry.ipAddress}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-xs truncate">{entry.comment || "—"}</TableCell>
                      </TableRow>
                      {expanded[entry.id] && (
                        <TableRow key={`${entry.id}-detail`} className="bg-slate-50">
                          <TableCell colSpan={8} className="py-3 px-6">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-semibold text-slate-700 mb-1">Valeurs précédentes</p>
                                <pre className="bg-white border rounded p-2 text-slate-600 overflow-auto max-h-32">
                                  {entry.oldValues ? JSON.stringify(entry.oldValues, null, 2) : "—"}
                                </pre>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-700 mb-1">Nouvelles valeurs</p>
                                <pre className="bg-white border rounded p-2 text-slate-600 overflow-auto max-h-32">
                                  {entry.newValues ? JSON.stringify(entry.newValues, null, 2) : "—"}
                                </pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{total} événements — Page {page} / {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
