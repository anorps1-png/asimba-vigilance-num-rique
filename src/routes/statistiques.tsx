import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Download, FileSpreadsheet } from "lucide-react";
import {
  useAlertesDashboard,
  useAlertesEvolution,
  useCategoriesStats,
  useRegionsStats,
  useSourcesStats,
  useTopAnalystes,
} from "@/lib/queries/alertes";

export const Route = createFileRoute("/statistiques")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Statistiques — ASIMBA" },
      {
        name: "description",
        content: "Indicateurs clés, tendances et performances des équipes d'analyse.",
      },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const [monthsRange, setMonthsRange] = useState("12");
  const { data: allAlerts } = useAlertesDashboard({ limit: 5000 });
  const { data: evolutionData } = useAlertesEvolution(7);
  const { data: categoriesStats } = useCategoriesStats();
  const { data: regionsStats } = useRegionsStats();
  const { data: sourcesStats } = useSourcesStats();
  const { data: analystsStats } = useTopAnalystes();

  const monthsNum = parseInt(monthsRange, 10);

  const monthlyTrend = useMemo(() => {
    if (!allAlerts) return [];

    const now = new Date();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsNum);

    const monthMap = new Map<string, { alertes: number; resolues: number }>();

    allAlerts.forEach((alert) => {
      const detecte = alert.detecte ? new Date(alert.detecte) : null;
      if (!detecte || detecte < cutoff) return;

      const year = detecte.getFullYear();
      const month = String(detecte.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { alertes: 0, resolues: 0 });
      }
      const entry = monthMap.get(key)!;
      entry.alertes += 1;
      if (alert.statut === "resolu") {
        entry.resolues += 1;
      }
    });

    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const result = [];
    for (let i = monthsNum - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;
      const data = monthMap.get(key) ?? { alertes: 0, resolues: 0 };
      result.push({
        mois: months[d.getMonth()],
        alertes: data.alertes,
        resolues: data.resolues,
      });
    }
    return result;
  }, [allAlerts, monthsNum]);

  const categoriesData = useMemo(() => {
    if (!categoriesStats) return [];
    return categoriesStats.map((c) => ({
      nom: c.categorie ?? "Autre",
      part: c.total ?? 0,
    }));
  }, [categoriesStats]);

  const regionsData = useMemo(() => {
    if (!regionsStats) return [];
    return regionsStats.map((r) => ({
      region: r.region ?? "—",
      alertes: r.total ?? 0,
      critiques: r.critiques ?? 0,
    }));
  }, [regionsStats]);

  const sourcesData = useMemo(() => {
    if (!sourcesStats) return [];
    const sourceColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];
    const total = sourcesStats.reduce((sum, s) => sum + (s.total ?? 0), 0);
    return sourcesStats.map((s, i) => ({
      nom: s.source ?? "—",
      part: total ? Math.round(((s.total ?? 0) / total) * 100) : 0,
      couleur: sourceColors[i % sourceColors.length],
    }));
  }, [sourcesStats]);

  const topAnalystes = useMemo(() => {
    if (!analystsStats) return [];
    return analystsStats.map((a) => ({
      nom: a.analyste ?? "—",
      moyenne: a.duree_moyenne_resolution ?? "—",
      traites: a.total_traites ?? 0,
      score:
        (a.total_traites ?? 0) > 0
          ? Math.round(((a.total_resolus ?? 0) / (a.total_traites ?? 1)) * 100)
          : 0,
    }));
  }, [analystsStats]);

  const handleExportCSV = () => {
    let csvContent = "--- TENDANCES MENSUELLES (Alertes vs Resolutions) ---\n";
    csvContent += "Mois,Alertes,Resolutions\n";
    monthlyTrend.forEach(row => {
      csvContent += `"${row.mois}",${row.alertes},${row.resolues}\n`;
    });

    csvContent += "\n--- CATEGORIES D'ALERTES ---\n";
    csvContent += "Categorie,Total\n";
    categoriesData.forEach(row => {
      csvContent += `"${row.nom}",${row.part}\n`;
    });

    csvContent += "\n--- REPARTITION REGIONALE ---\n";
    csvContent += "Region,Alertes,Critiques\n";
    regionsData.forEach(row => {
      csvContent += `"${row.region}",${row.alertes},${row.critiques}\n`;
    });

    csvContent += "\n--- TOP ANALYSTES ---\n";
    csvContent += "Analyste,Dossiers Traites,Taux Resolution (%),Duree Moyenne\n";
    topAnalystes.forEach(row => {
      csvContent += `"${row.nom}",${row.traites},${row.score},"${row.moyenne}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `statistiques-asimba-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Données statistiques exportées en CSV !");
  };

  const handleExportPDF = () => {
    window.print();
    toast.success("Impression lancée / Export PDF.");
  };

  return (
    <AppLayout title="Statistiques" subtitle="Analyse comparative et tendances">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Analytics"
          title="Tableau statistique"
          description="Suivi consolidé des performances opérationnelles, régionales et institutionnelles."
          actions={
            <>
              <Select value={monthsRange} onValueChange={setMonthsRange}>
                <SelectTrigger className="h-9 w-[160px] text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 derniers mois</SelectItem>
                  <SelectItem value="6">6 derniers mois</SelectItem>
                  <SelectItem value="12">12 derniers mois</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportCSV}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={handleExportPDF}>
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="shadow-elev-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[13.5px] font-semibold">
                Alertes vs Résolutions ({monthsRange} mois)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyTrend}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--color-border)"
                      vertical={false}
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="mois"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="alertes"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#g1)"
                      name="Alertes détectées"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolues"
                      stroke="var(--color-success)"
                      strokeWidth={2}
                      fill="url(#g2)"
                      name="Résolues"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-[13.5px] font-semibold">Catégories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoriesData}
                      dataKey="part"
                      nameKey="nom"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {categoriesData.map((_, i) => (
                        <Cell key={i} fill={`var(--color-chart-${(i % 5) + 1})`} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {categoriesData.map((c, i) => (
                  <div key={c.nom} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: `var(--color-chart-${(i % 5) + 1})` }}
                    />
                    <span className="truncate">{c.nom}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="shadow-elev-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[13.5px] font-semibold">Comparaison régionale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionsData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid
                      stroke="var(--color-border)"
                      vertical={false}
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="region"
                      stroke="var(--color-muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="alertes"
                      radius={[6, 6, 0, 0]}
                      fill="var(--color-primary)"
                      name="Alertes"
                    />
                    <Bar
                      dataKey="critiques"
                      radius={[6, 6, 0, 0]}
                      fill="var(--color-destructive)"
                      name="Critiques"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-[13.5px] font-semibold">Performances analystes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topAnalystes.map((a) => (
                <div key={a.nom} className="flex items-center justify-between text-[12.5px]">
                  <div>
                    <div className="font-medium">{a.nom}</div>
                    <div className="text-[10.5px] text-muted-foreground">
                      Temps moyen · {a.moyenne}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{a.traites}</div>
                    <div className="text-[10.5px] text-muted-foreground">Score {a.score}%</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-[13.5px] font-semibold">Répartition plateformes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={sourcesData}
                    margin={{ top: 8, right: 12, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--color-border)"
                      horizontal={false}
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      type="number"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="nom"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="part" radius={[0, 6, 6, 0]}>
                      {sourcesData.map((s, i) => (
                        <Cell key={i} fill={s.couleur} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-[13.5px] font-semibold">Tendance hebdomadaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={evolutionData ?? []}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--color-border)"
                      vertical={false}
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="jour"
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="critiques"
                      stroke="var(--color-destructive)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="elevees"
                      stroke="var(--color-warning)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="moyennes"
                      stroke="var(--color-info)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
