"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Database, ChevronRight } from "lucide-react";

interface Referential {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  [key: string]: unknown;
}

interface RefConfig {
  title: string;
  endpoint: string;
  columns: { key: string; label: string; render?: (v: unknown, row: Referential) => React.ReactNode }[];
}

const REF_CONFIGS: Record<string, RefConfig> = {
  sourceTypes: {
    title: "Sources",
    endpoint: "/api/admin/ref/sourceTypes",
    columns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "sourceCoefficient", label: "Coefficient", render: (v) => <span className="font-mono">{String(v)}</span> },
      { key: "isRegulator", label: "Régulateur", render: (v) => v ? <Badge variant="destructive">Oui</Badge> : <Badge variant="secondary">Non</Badge> },
    ],
  },
  severityLevels: {
    title: "Niveaux de Gravité",
    endpoint: "/api/admin/ref/severityLevels",
    columns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "numericValue", label: "Valeur", render: (v) => <Badge>{String(v)}</Badge> },
      { key: "color", label: "Couleur", render: (v) => <span className="inline-block w-5 h-5 rounded-full border" style={{ backgroundColor: String(v) }} /> },
    ],
  },
  probabilityLevels: {
    title: "Niveaux de Probabilité",
    endpoint: "/api/admin/ref/probabilityLevels",
    columns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "numericValue", label: "Valeur", render: (v) => <Badge>{String(v)}</Badge> },
    ],
  },
  priorityLevels: {
    title: "Niveaux de Priorité",
    endpoint: "/api/admin/ref/priorityLevels",
    columns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "scoreMin", label: "Score Min" },
      { key: "scoreMax", label: "Score Max" },
      { key: "color", label: "Couleur", render: (v) => <span className="inline-block w-5 h-5 rounded-full border" style={{ backgroundColor: String(v) }} /> },
    ],
  },
  recommendationStatuses: {
    title: "Statuts Recommandations",
    endpoint: "/api/admin/ref/recommendationStatuses",
    columns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "color", label: "Couleur", render: (v) => <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: String(v) }} />{String(v)}</span> },
      { key: "isOpen", label: "Ouverte", render: (v) => v ? <Badge variant="default">Oui</Badge> : <Badge variant="secondary">Non</Badge> },
      { key: "isFinal", label: "Finale", render: (v) => v ? <Badge variant="destructive">Oui</Badge> : null },
    ],
  },
  riskTypes: {
    title: "Types de Risques",
    endpoint: "/api/admin/ref/riskTypes",
    columns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "category", label: "Catégorie" },
    ],
  },
  entities: {
    title: "Entités",
    endpoint: "/api/admin/ref/entities",
    columns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "type", label: "Type" },
    ],
  },
  missionTypes: {
    title: "Types de Missions",
    endpoint: "/api/admin/ref/missionTypes",
    columns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
    ],
  },
};

export default function ReferentialsPage() {
  const [activeTab, setActiveTab] = useState("sourceTypes");
  const [data, setData] = useState<Record<string, Referential[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const fetchRef = async (key: string) => {
    if (data[key] || loading[key]) return;
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/admin/referentials?type=all`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    fetchRef(activeTab);
  }, [activeTab]);

  const currentConfig = REF_CONFIGS[activeTab];
  const currentData = (data[activeTab] || []).filter(
    (item) => !search || item.label.toLowerCase().includes(search.toLowerCase()) || item.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestion des Référentiels</h1>
            <p className="text-sm text-slate-500 mt-1">Administrez tous les référentiels métier de l'application</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-slate-100 p-1">
            {Object.entries(REF_CONFIGS).map(([key, cfg]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {cfg.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(REF_CONFIGS).map(([key, cfg]) => (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    {cfg.title}
                    <Badge variant="secondary">{currentData.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading[key] ? (
                    <div className="p-4 space-y-2">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          {cfg.columns.map((col) => (
                            <TableHead key={col.key} className="text-xs font-semibold text-slate-600 uppercase">{col.label}</TableHead>
                          ))}
                          <TableHead className="text-xs font-semibold text-slate-600 uppercase">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={cfg.columns.length + 1} className="text-center py-8 text-slate-400">
                              Aucun élément trouvé
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentData.map((item) => (
                            <TableRow key={item.id} className="hover:bg-slate-50">
                              {cfg.columns.map((col) => (
                                <TableCell key={col.key} className="text-sm">
                                  {col.render ? col.render(item[col.key], item) : String(item[col.key] ?? "—")}
                                </TableCell>
                              ))}
                              <TableCell>
                                <Badge variant={item.isActive ? "default" : "secondary"}>
                                  {item.isActive ? "Actif" : "Inactif"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
