"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Settings, Bell, Shield, GitBranch, AlertTriangle, CheckCircle } from "lucide-react";

interface Parameter {
  id: string;
  category: string;
  key: string;
  value: string;
  label?: string;
  description?: string;
  dataType: string;
  isEditable: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  WORKFLOW: <GitBranch className="h-4 w-4" />,
  ALERTS: <AlertTriangle className="h-4 w-4" />,
  NOTIFICATIONS: <Bell className="h-4 w-4" />,
  SECURITY: <Shield className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  WORKFLOW: "Workflow & Validation",
  ALERTS: "Seuils d'Alerte",
  NOTIFICATIONS: "Notifications",
  SECURITY: "Sécurité",
};

export default function ParametersPage() {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/parameters")
      .then((r) => r.json())
      .then((data) => {
        setParameters(data);
        const initial: Record<string, string> = {};
        data.forEach((p: Parameter) => { initial[`${p.category}_${p.key}`] = p.value; });
        setEditValues(initial);
      })
      .catch(() => setError("Impossible de charger les paramètres"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (param: Parameter) => {
    const k = `${param.category}_${param.key}`;
    setSaving((prev) => ({ ...prev, [k]: true }));
    try {
      const res = await fetch("/api/admin/parameters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: param.category, key: param.key, value: editValues[k] }),
      });
      if (res.ok) {
        setSaved((prev) => ({ ...prev, [k]: true }));
        setTimeout(() => setSaved((prev) => ({ ...prev, [k]: false })), 2000);
      } else {
        setError("Erreur lors de la sauvegarde");
      }
    } finally {
      setSaving((prev) => ({ ...prev, [k]: false }));
    }
  };

  const grouped = parameters.reduce<Record<string, Parameter[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres Système</h1>
          <p className="text-sm text-slate-500 mt-1">Configurez les règles métier et comportements de l'application</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, params]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-blue-600">{CATEGORY_ICONS[category] || <Settings className="h-4 w-4" />}</span>
                    {CATEGORY_LABELS[category] || category}
                    <Badge variant="secondary">{params.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {params.map((param) => {
                    const k = `${param.category}_${param.key}`;
                    return (
                      <div key={param.key} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-slate-100 last:border-0">
                        <div className="col-span-5">
                          <Label className="font-medium text-slate-800 text-sm">
                            {param.label || param.key}
                          </Label>
                          {param.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{param.description}</p>
                          )}
                          <Badge variant="outline" className="mt-1 text-xs">{param.dataType}</Badge>
                        </div>
                        <div className="col-span-5">
                          <Input
                            value={editValues[k] ?? param.value}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, [k]: e.target.value }))}
                            disabled={!param.isEditable}
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          {saved[k] ? (
                            <span className="flex items-center gap-1 text-emerald-600 text-sm">
                              <CheckCircle className="h-4 w-4" /> Sauvegardé
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSave(param)}
                              disabled={!param.isEditable || saving[k] || editValues[k] === param.value}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              {saving[k] ? "..." : "Sauvegarder"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
