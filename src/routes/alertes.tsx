import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader, SeverityBadge, StatusPill } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Filter, Search, SlidersHorizontal } from "lucide-react";
import { formatDateTime, regions } from "@/lib/mock-data";
import type { Database } from "@/integrations/supabase/types";
import { useAlertesDashboard } from "@/lib/queries/alertes";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const Route = createFileRoute("/alertes")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Alertes — ASIMBA" },
      {
        name: "description",
        content: "Toutes les alertes détectées par le moteur d'analyse ASIMBA.",
      },
    ],
  }),
  component: AlertesPage,
});

const ITEMS_PER_PAGE = 24;

function AlertesPage() {
  const { data: allAlerts } = useAlertesDashboard({ limit: 500 });
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [minScore, setMinScore] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleThreshold, setRuleThreshold] = useState("80");
  const [ruleKeywords, setRuleKeywords] = useState("");
  const [ruleCategory, setRuleCategory] = useState("all");

  const sources = useMemo(() => {
    if (!allAlerts) return [];
    return Array.from(new Set(allAlerts.map((a) => a.source).filter(Boolean))) as string[];
  }, [allAlerts]);

  const filteredAlerts = useMemo(() => {
    if (!allAlerts) return [];
    return allAlerts.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${a.reference} ${a.titre} ${a.mots_cles?.join(" ")}`.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (severity !== "all" && a.severite !== severity) {
        return false;
      }
      if (source !== "all" && a.source !== source) {
        return false;
      }
      if (region !== "all" && a.region !== region) {
        return false;
      }
      if (minScore !== "all" && (a.score ?? 0) < Number(minScore)) {
        return false;
      }
      if (statusFilter !== "all" && a.statut !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [allAlerts, search, severity, source, region, minScore, statusFilter]);

  const totalItems = filteredAlerts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const pageItems = filteredAlerts.slice(startIdx, endIdx);

  const handleReset = () => {
    setSearch("");
    setSeverity("all");
    setSource("all");
    setRegion("all");
    setMinScore("all");
    setStatusFilter("all");
    setPage(1);
  };

  const handleExport = () => {
    const csvContent = [
      ["Reference", "Titre", "Niveau", "Statut", "Source", "Region", "Ville", "Score", "Date"],
      ...filteredAlerts.map(a => [
        a.reference ?? "",
        a.titre ?? "",
        a.severite ?? "",
        a.statut ?? "",
        a.source ?? "",
        a.region ?? "",
        a.ville ?? "",
        a.score ?? "",
        a.detecte ?? ""
      ])
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `alertes-export-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      toast.error("Veuillez saisir un nom de règle.");
      return;
    }
    toast.success("Règle automatique créée !", {
      description: `La règle "${ruleName}" surveillera les contenus avec un score > ${ruleThreshold}%.`,
    });
    setRuleName("");
    setRuleKeywords("");
    setRuleCategory("all");
    setShowRuleDialog(false);
  };

  return (
    <AppLayout
      title="Alertes"
      subtitle={`${totalItems} alertes · mise à jour en temps réel`}
      actions={
        <>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Exporter
          </Button>
          <Button size="sm" className="h-9" onClick={() => setShowRuleDialog(true)}>
            Nouvelle règle
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 space-y-5">
        <PageHeader
          eyebrow="Centre d'alertes"
          title="Alertes détectées"
          description="Toutes les alertes générées automatiquement par le moteur d'analyse ASIMBA à partir des signalements et sources publiques."
        />

        <Card className="shadow-elev-1">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher une alerte, un mot-clé, une référence…"
                className="h-9 pl-8 text-[12.5px]"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={severity}
              onValueChange={(v) => {
                setSeverity(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                <SelectItem value="critique">Critique</SelectItem>
                <SelectItem value="elevee">Élevée</SelectItem>
                <SelectItem value="moyenne">Moyenne</SelectItem>
                <SelectItem value="faible">Faible</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={source}
              onValueChange={(v) => {
                setSource(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes plateformes</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={region}
              onValueChange={(v) => {
                setRegion(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes régions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-9 gap-1.5", showAdvancedFilters && "bg-accent")}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filtres avancés
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-muted-foreground"
              onClick={handleReset}
            >
              <Filter className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          </div>
          {showAdvancedFilters && (
            <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/20 border-b border-border text-[12px] border-t border-t-border">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">Score min:</span>
                <Select value={minScore} onValueChange={(v) => { setMinScore(v); setPage(1); }}>
                  <SelectTrigger className="h-8 w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">Statut:</span>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-8 w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="nouveau">Nouveau</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="resolu">Résolu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox />
                  </TableHead>
                  <TableHead className="w-[130px]">Référence</TableHead>
                  <TableHead className="w-[110px]">Niveau</TableHead>
                  <TableHead>Contenu</TableHead>
                  <TableHead className="w-[110px]">Source</TableHead>
                  <TableHead className="w-[150px]">Localisation</TableHead>
                  <TableHead className="w-[140px]">Détecté le</TableHead>
                  <TableHead className="w-[80px] text-right">Score</TableHead>
                  <TableHead className="w-[110px]">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer">
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[11.5px] text-muted-foreground">
                        {a.reference}
                      </span>
                    </TableCell>
                    <TableCell>{a.severite && <SeverityBadge level={a.severite} />}</TableCell>
                    <TableCell>
                      <Link
                        to="/alertes"
                        className="block max-w-[420px] truncate text-[12.5px] font-medium text-foreground hover:text-primary"
                      >
                        {a.titre}
                      </Link>
                      <div className="mt-0.5 max-w-[420px] truncate text-[11px] text-muted-foreground">
                        {a.categorie}
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-foreground">{a.source ?? "—"}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {a.ville ?? "—"}, {a.region ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[11.5px] text-muted-foreground">
                      {a.detecte ? formatDateTime(a.detecte) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-[13px]">
                      {a.score}
                    </TableCell>
                    <TableCell>{a.statut && <StatusPill status={a.statut} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[12px] text-muted-foreground">
            <div>
              Affichage de{" "}
              <span className="font-medium text-foreground">
                {totalItems === 0 ? 0 : startIdx + 1}–{Math.min(endIdx, totalItems)}
              </span>{" "}
              sur <span className="font-medium text-foreground">{totalItems}</span> alertes
            </div>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  if (
                    totalPages <= 7 ||
                    i < 2 ||
                    i >= totalPages - 2 ||
                    Math.abs(i - (page - 1)) < 2
                  ) {
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  if (i === 2 && page > 4) {
                    return (
                      <PaginationItem key="ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </Card>
      </div>

      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle règle d'alerte automatique</DialogTitle>
            <DialogDescription>
              Configurez une règle pour catégoriser ou escalader automatiquement les futurs signalements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-name" className="text-[12.5px]">Nom de la règle</Label>
              <Input
                id="rule-name"
                placeholder="Ex: Escalade Média Spams"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-threshold" className="text-[12.5px]">Score de confiance minimum (%)</Label>
              <Input
                id="rule-threshold"
                type="number"
                min="0"
                max="100"
                value={ruleThreshold}
                onChange={(e) => setRuleThreshold(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-keywords" className="text-[12.5px]">Mots-clés (séparés par des virgules)</Label>
              <Input
                id="rule-keywords"
                placeholder="Ex: arnaque, fausse info, diffamation"
                value={ruleKeywords}
                onChange={(e) => setRuleKeywords(e.target.value)}
                className="h-10"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowRuleDialog(false)}>
                Annuler
              </Button>
              <Button type="submit">Créer la règle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
