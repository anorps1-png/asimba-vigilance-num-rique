import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import { useAuditLogs } from "@/lib/queries/staff";
import type { Database } from "@/integrations/supabase/types";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export const Route = createFileRoute("/audit")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Journal d'audit — ASIMBA" },
      {
        name: "description",
        content: "Traçabilité complète des actions effectuées sur la plateforme.",
      },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("all");
  const { data: logs, isLoading } = useAuditLogs();

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log: AuditLog) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        log.action.toLowerCase().includes(searchLower) ||
        log.cible.toLowerCase().includes(searchLower) ||
        (log.ip && log.ip.toString().includes(searchLower));

      const matchesNiveau = niveauFilter === "all" || log.niveau === niveauFilter;
      return matchesSearch && matchesNiveau;
    });
  }, [logs, searchTerm, niveauFilter]);

  const handleExport = () => {
    const csv = [
      ["Horodatage", "Niveau", "Action", "Cible", "IP", "Utilisateur"],
      ...filteredLogs.map((l: AuditLog) => [
        l.created_at ? new Date(l.created_at).toISOString() : "",
        l.niveau,
        l.action,
        l.cible,
        l.ip || "",
        l.acteur_id || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-${new Date().toISOString()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout title="Journal d'audit" subtitle="Traçabilité et conformité">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 space-y-5">
        <PageHeader
          eyebrow="Sécurité"
          title="Journal d'audit"
          description="Chaque action sensible est enregistrée, horodatée et signée. Ces journaux sont exportables pour audit externe."
          actions={
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Exporter le journal
            </Button>
          }
        />
        <Card className="shadow-elev-1">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher action, cible, IP…"
                className="h-9 pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={niveauFilter} onValueChange={setNiveauFilter}>
              <SelectTrigger className="h-9 w-[140px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Chargement...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Aucun log d'audit</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">Horodatage</TableHead>
                  <TableHead className="w-[110px]">Niveau</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead className="w-[140px]">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-[11.5px] text-muted-foreground">
                      {log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          log.niveau === "critical"
                            ? "text-destructive border-destructive/30 bg-destructive/5"
                            : log.niveau === "warning"
                              ? "text-[color:oklch(0.45_0.15_60)] border-warning/40 bg-warning/10"
                              : "text-muted-foreground"
                        }
                      >
                        {log.niveau}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12.5px] font-medium">{log.action}</TableCell>
                    <TableCell className="font-mono text-[11.5px] text-muted-foreground">
                      {log.cible}
                    </TableCell>
                    <TableCell className="font-mono text-[11.5px] text-muted-foreground">
                      {log.ip ? log.ip.toString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
