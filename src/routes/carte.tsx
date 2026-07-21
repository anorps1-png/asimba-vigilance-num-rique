import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader, SeverityBadge } from "@/components/AppLayout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Maximize2, Minus, Plus as PlusIcon, Layers, Download } from "lucide-react";
import { villes } from "@/lib/mock-data";
import { useAlertesDashboard, useRegionsStats } from "@/lib/queries/alertes";

export const Route = createFileRoute("/carte")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Carte des risques — ASIMBA" },
      { name: "description", content: "Carte interactive des alertes et incidents au Cameroun." },
    ],
  }),
  component: CartePage,
});

// SVG map viewBox tuned to Cameroon bounding box
// lon 8.5 - 16.2  |  lat 1.6 - 13.1
const LON_MIN = 8.4,
  LON_MAX = 16.3,
  LAT_MIN = 1.5,
  LAT_MAX = 13.2;
const W = 500,
  H = 620;
function project(lat: number, lng: number) {
  const x = ((lng - LON_MIN) / (LON_MAX - LON_MIN)) * W;
  const y = H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H;
  return { x, y };
}

// Simplified Cameroon outline (approximate — for illustrative map only)
const CAMEROON_PATH =
  "M 9.9 447.5 L 11.7 443.4 L 15.2 438.4 L 20.0 432.0 L 25.4 424.1 L 29.1 410.0 L 31.6 401.2 L 33.9 393.1 L 37.8 385.9 L 41.8 381.1 L 53.1 371.7 L 61.6 364.6 L 66.0 361.8 L 69.0 359.4 L 74.3 356.6 L 79.7 353.3 L 83.9 347.1 L 87.3 341.3 L 89.9 340.0 L 93.3 339.0 L 103.7 332.7 L 110.4 328.7 L 111.9 330.7 L 113.0 333.2 L 114.3 334.3 L 119.8 335.1 L 127.4 335.0 L 131.8 334.3 L 134.1 332.2 L 136.5 326.6 L 137.9 325.5 L 139.6 325.2 L 147.9 329.2 L 154.8 334.8 L 161.7 340.4 L 165.1 342.4 L 166.6 344.6 L 169.6 354.8 L 171.3 357.3 L 174.3 358.3 L 179.6 357.7 L 185.1 355.9 L 190.0 353.2 L 194.8 349.9 L 198.0 346.8 L 199.5 344.6 L 200.2 336.2 L 201.3 334.4 L 206.2 331.1 L 214.4 325.6 L 219.1 322.4 L 218.7 321.2 L 215.7 317.8 L 213.1 314.1 L 215.8 310.3 L 218.5 307.3 L 228.9 297.3 L 228.9 294.0 L 229.4 290.0 L 237.7 278.6 L 242.5 263.5 L 242.6 260.6 L 247.6 253.3 L 253.4 244.0 L 264.7 242.5 L 269.1 240.2 L 274.1 236.0 L 277.4 232.2 L 278.9 228.6 L 280.0 221.5 L 282.0 213.5 L 283.3 206.5 L 286.7 200.0 L 292.4 196.7 L 302.2 194.0 L 303.7 192.7 L 305.1 188.4 L 306.3 179.4 L 306.6 174.0 L 306.9 171.7 L 308.2 167.7 L 317.4 160.5 L 321.4 149.3 L 325.0 137.5 L 335.4 123.3 L 347.6 109.2 L 353.3 105.4 L 358.0 103.6 L 363.5 103.4 L 367.2 102.4 L 380.3 95.3 L 385.8 92.9 L 389.9 90.5 L 390.8 88.4 L 391.2 85.3 L 390.0 78.0 L 392.2 72.6 L 393.6 64.3 L 394.1 57.8 L 393.7 55.6 L 391.6 52.5 L 391.2 51.8 L 387.3 47.8 L 380.7 45.4 L 371.7 44.7 L 366.9 43.3 L 366.1 39.9 L 365.7 37.9 L 365.2 35.8 L 364.6 31.1 L 358.5 6.4 L 369.9 6.5 L 383.7 9.4 L 387.1 11.7 L 388.9 20.1 L 393.9 24.9 L 402.6 28.8 L 408.0 37.0 L 410.2 49.3 L 415.0 56.7 L 416.1 57.8 L 421.5 68.5 L 422.9 71.8 L 423.3 78.2 L 422.7 82.5 L 425.4 87.9 L 421.2 97.1 L 420.0 102.7 L 419.6 110.6 L 422.1 124.5 L 426.1 135.2 L 430.4 143.9 L 435.2 150.6 L 443.0 158.1 L 451.4 164.9 L 459.2 169.2 L 452.0 171.7 L 438.0 172.0 L 429.9 170.6 L 426.1 170.5 L 422.3 171.4 L 407.3 172.7 L 392.3 172.1 L 378.3 170.4 L 369.8 170.6 L 363.3 174.8 L 358.0 181.0 L 353.0 185.9 L 354.7 191.4 L 358.5 194.4 L 365.7 201.0 L 372.2 207.5 L 375.5 211.8 L 388.4 221.2 L 400.8 229.7 L 403.2 231.1 L 406.7 232.6 L 408.9 233.2 L 415.7 238.1 L 425.1 246.0 L 433.7 258.5 L 439.8 271.1 L 445.8 283.4 L 448.4 285.5 L 452.5 286.8 L 453.0 289.4 L 452.7 293.3 L 451.4 296.5 L 448.1 300.8 L 441.7 309.6 L 433.3 314.6 L 430.8 317.6 L 429.5 321.4 L 427.7 325.2 L 423.2 333.3 L 419.9 340.0 L 416.6 342.0 L 409.0 352.1 L 403.8 362.2 L 402.8 364.8 L 401.2 366.7 L 398.7 368.3 L 389.8 371.4 L 386.8 373.0 L 384.5 374.8 L 382.3 376.9 L 381.7 379.5 L 383.8 383.1 L 386.3 385.9 L 388.8 386.1 L 391.0 386.0 L 392.3 387.7 L 393.5 388.7 L 393.5 408.3 L 391.4 411.2 L 391.4 412.6 L 390.4 415.9 L 390.1 419.7 L 390.7 421.2 L 392.5 422.4 L 395.0 425.0 L 396.3 431.1 L 399.3 452.3 L 400.7 455.6 L 403.2 457.9 L 411.0 462.5 L 419.2 468.5 L 421.7 472.4 L 423.3 478.8 L 426.4 483.9 L 426.3 485.6 L 425.0 486.2 L 422.0 486.3 L 419.9 486.7 L 421.7 490.3 L 425.9 496.7 L 432.9 503.3 L 440.5 510.5 L 446.7 516.3 L 454.5 523.1 L 460.5 528.3 L 466.8 533.8 L 471.5 535.1 L 475.0 535.4 L 476.5 536.5 L 478.4 539.0 L 481.5 541.7 L 485.0 545.4 L 486.2 549.0 L 484.8 552.5 L 486.2 557.6 L 486.3 558.0 L 487.5 560.0 L 487.1 561.8 L 487.8 568.4 L 489.6 574.2 L 492.6 579.2 L 492.6 579.6 L 492.2 582.7 L 488.3 584.6 L 486.1 587.8 L 485.4 592.4 L 486.6 597.8 L 489.6 604.3 L 489.6 608.1 L 488.6 608.7 L 486.7 609.9 L 484.8 610.7 L 479.4 606.2 L 473.5 603.2 L 464.7 598.0 L 455.7 596.1 L 444.1 595.8 L 439.2 596.4 L 435.6 594.5 L 430.6 592.2 L 427.9 591.6 L 424.0 593.4 L 421.4 593.5 L 418.1 592.8 L 411.5 592.9 L 410.9 589.8 L 409.8 589.2 L 402.7 589.5 L 400.5 587.0 L 399.6 587.3 L 396.8 586.5 L 391.1 583.0 L 385.1 585.3 L 372.6 585.0 L 356.6 585.1 L 340.0 585.2 L 324.9 585.1 L 309.7 584.9 L 308.2 581.6 L 305.1 579.9 L 299.4 579.8 L 282.8 580.4 L 270.0 579.9 L 265.9 579.5 L 261.4 578.6 L 250.7 577.8 L 237.6 578.4 L 234.6 578.3 L 224.0 578.4 L 199.9 577.5 L 186.6 577.6 L 186.9 579.7 L 186.1 581.1 L 185.4 584.6 L 170.7 584.6 L 151.3 584.6 L 133.1 584.6 L 120.7 584.6 L 100.0 584.6 L 93.0 582.2 L 90.9 580.7 L 90.5 578.9 L 90.3 577.7 L 88.7 577.4 L 90.0 564.9 L 92.9 554.6 L 94.0 544.9 L 98.0 536.3 L 95.9 527.8 L 93.4 524.1 L 80.5 512.0 L 86.4 507.5 L 78.6 508.1 L 77.0 503.6 L 73.2 498.2 L 75.5 497.4 L 77.7 494.4 L 84.8 495.3 L 84.6 493.9 L 78.5 489.4 L 79.1 487.1 L 81.6 484.5 L 80.4 483.5 L 76.0 486.1 L 72.8 486.0 L 70.4 484.3 L 68.6 484.0 L 69.7 487.5 L 67.2 490.6 L 64.9 491.6 L 60.9 491.5 L 57.7 490.7 L 56.8 489.0 L 53.7 487.6 L 45.2 485.3 L 38.0 482.7 L 36.5 475.3 L 33.7 472.1 L 32.5 468.6 L 31.8 464.5 L 32.8 458.2 L 31.0 457.2 L 28.9 456.8 L 25.8 457.1 L 22.9 456.8 L 19.5 453.3 L 16.5 452.0 L 18.3 458.4 L 16.2 460.2 L 11.0 459.6 L 8.8 457.2 L 8.4 455.4 L 10.8 447.7 L 9.9 447.5 Z";

function CartePage() {
  const { data: regionsData } = useRegionsStats();
  const { data: allAlerts } = useAlertesDashboard({ limit: 200 });

  const [mapMode, setMapMode] = useState<"heat" | "markers" | "clusters">("heat");
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  const alerts = allAlerts ?? [];
  const stats = regionsData ?? [];
  const maxAlerts = Math.max(...stats.map((s) => s.total ?? 0), 1);

  const handleExport = () => {
    const csvContent = [
      ["Region", "Total Alertes", "Alertes Critiques"],
      ...stats.map(s => [
        s.region ?? "",
        s.total ?? 0,
        s.critiques ?? 0
      ])
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `carte-export-regions-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Statistiques régionales de la carte exportées !");
  };

  return (
    <AppLayout title="Carte des risques" subtitle="Répartition géographique · Cameroun">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Vision géospatiale"
          title="Carte interactive des risques"
          description="Visualisation en temps réel des zones de tension numérique détectées par ASIMBA à l'échelle nationale."
          actions={
            <>
              <Select defaultValue="all">
                <SelectTrigger className="h-9 w-[160px] text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  <SelectItem value="v">Incitation à la violence</SelectItem>
                  <SelectItem value="d">Désinformation</SelectItem>
                  <SelectItem value="h">Harcèlement</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Exporter
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="shadow-elev-1 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMapMode("heat")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                    mapMode === "heat"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Chaleur
                </button>
                <button
                  onClick={() => setMapMode("markers")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                    mapMode === "markers"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Marqueurs
                </button>
                <button
                  onClick={() => setMapMode("clusters")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                    mapMode === "clusters"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Clusters
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  title="Zoom +"
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Zoom -"
                  onClick={() => setZoom(z => Math.max(0.75, z - 0.25))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Afficher/Masquer la grille"
                  onClick={() => setShowGrid(!showGrid)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors",
                    showGrid && "text-primary border-primary/30 bg-primary/5"
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                </button>
                <button
                  title="Réinitialiser le zoom"
                  onClick={() => setZoom(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="relative h-[640px] w-full bg-gradient-to-br from-[oklch(0.97_0.01_240)] via-background to-[oklch(0.95_0.02_220)]">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
                <defs>
                  <radialGradient id="heat-critical" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity="0.75" />
                    <stop offset="60%" stopColor="var(--color-destructive)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="heat-warn" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--color-warning)" stopOpacity="0.65" />
                    <stop offset="60%" stopColor="var(--color-warning)" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="var(--color-warning)" stopOpacity="0" />
                  </radialGradient>
                  <pattern id="grid-p" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path
                      d="M 24 0 L 0 0 0 24"
                      fill="none"
                      stroke="var(--color-border)"
                      strokeWidth="0.5"
                      opacity="0.5"
                    />
                  </pattern>
                </defs>

                {showGrid && <rect width={W} height={H} fill="url(#grid-p)" />}

                <g transform={`translate(${W/2}, ${H/2}) scale(${zoom}) translate(${-W/2}, ${-H/2})`}>
                  <path
                    d={CAMEROON_PATH}
                    fill="var(--color-card)"
                    stroke="var(--color-border)"
                    strokeWidth="1.5"
                  />

                  {/* Heat blobs */}
                  {mapMode === "heat" && stats.map((region) => {
                    const city = Object.values(villes).find((v) => v.region === region.region);
                    if (!city) return null;
                    const { x, y } = project(city.lat, city.lng);
                    const intensity = 20 + ((region.total ?? 0) / maxAlerts) * 80;
                    const isCrit = (region.critiques ?? 0) > 0;
                    return (
                      <circle
                        key={region.region}
                        cx={x}
                        cy={y}
                        r={intensity / 2}
                        fill={`url(#heat-${isCrit ? "critical" : "warn"})`}
                      />
                    );
                  })}

                  {/* Markers */}
                  {mapMode === "markers" && stats.map((region) => {
                    const city = Object.values(villes).find((v) => v.region === region.region);
                    if (!city) return null;
                    const { x, y } = project(city.lat, city.lng);
                    const isCrit = (region.critiques ?? 0) > 0;
                    return (
                      <g key={region.region + "m"} className="cursor-pointer group">
                        <circle
                          cx={x}
                          cy={y}
                          r={6}
                          fill={isCrit ? "var(--color-destructive)" : "var(--color-warning)"}
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        <text
                          x={x + 8}
                          y={y + 3}
                          fontSize="9"
                          fill="var(--color-foreground)"
                          fontFamily="Inter"
                          fontWeight="500"
                          opacity="0.8"
                        >
                          {region.region}
                        </text>
                        <title>{`${region.region}: ${region.total} alertes`}</title>
                      </g>
                    );
                  })}

                  {/* Individual Alert Markers from Database */}
                  {mapMode === "markers" && alerts.map((alert) => {
                    if (!alert.ville || !alert.id) return null;
                    const cleanCityName = alert.ville.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    const cityEntry = Object.entries(villes).find(([name]) => 
                      name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === cleanCityName
                    );
                    if (!cityEntry) return null;
                    const city = cityEntry[1];
                    // seed a deterministic jitter based on string id hashing to keep rendering stable
                    const hash = alert.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const jitterLat = ((hash % 10) - 5) * 0.03;
                    const jitterLng = (((hash >> 2) % 10) - 5) * 0.03;
                    const { x, y } = project(city.lat + jitterLat, city.lng + jitterLng);
                    const isCrit = alert.severite === "critique" || alert.severite === "elevee";
                    return (
                      <g key={alert.id + "i"} className="cursor-pointer group">
                        <circle
                          cx={x}
                          cy={y}
                          r={4}
                          fill={isCrit ? "var(--color-destructive)" : "var(--color-info)"}
                          stroke="white"
                          strokeWidth="1"
                        />
                        <title>{`${alert.titre || "Alerte"} (${alert.ville})`}</title>
                      </g>
                    );
                  })}

                  {/* Clusters */}
                  {mapMode === "clusters" && stats.map((region) => {
                    const city = Object.values(villes).find((v) => v.region === region.region);
                    if (!city) return null;
                    const { x, y } = project(city.lat, city.lng);
                    const isCrit = (region.critiques ?? 0) > 0;
                    return (
                      <g key={region.region + "c"} className="cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r={13}
                          fill={isCrit ? "var(--color-destructive)" : "var(--color-primary)"}
                          stroke="white"
                          strokeWidth="1.8"
                        />
                        <text
                          x={x}
                          y={y + 3.5}
                          textAnchor="middle"
                          fontSize="9"
                          fill="white"
                          fontWeight="bold"
                        >
                          {region.total}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/95 backdrop-blur p-3 shadow-elev-2">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Niveau de risque
                </div>
                {[
                  { c: "var(--color-destructive)", l: "Critique" },
                  { c: "var(--color-warning)", l: "Élevé" },
                  { c: "var(--color-info)", l: "Moyen" },
                  { c: "var(--color-success)", l: "Faible" },
                ].map((r) => (
                  <div key={r.l} className="flex items-center gap-2 py-0.5 text-[11.5px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.c }} />
                    {r.l}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="shadow-elev-1">
            <div className="border-b border-border p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Zones à surveiller
              </div>
              {stats.length > 0 && (
                <>
                  <div className="mt-2 text-[13.5px] font-semibold">
                    {stats[0].region}{" "}
                    {(stats[0].critiques ?? 0) > 0 && <SeverityBadge level="critique" />}
                  </div>
                  <div className="mt-2 text-[11.5px] text-muted-foreground">
                    {stats[0].total} alertes actives
                  </div>
                </>
              )}
            </div>
            <CardContent className="p-0">
              {stats.slice(0, 8).map((r) => (
                <div
                  key={r.region}
                  className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0 hover:bg-muted/40"
                >
                  <div>
                    <div className="text-[12.5px] font-medium">{r.region}</div>
                    <div className="text-[11px] text-muted-foreground">{r.critiques} critiques</div>
                  </div>
                  <div className="text-[13px] font-semibold tabular-nums">{r.total}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-elev-1">
          <div className="border-b border-border p-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Alertes localisées récentes
          </div>
          <div className="divide-y divide-border">
            {alerts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium truncate">{a.titre}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {a.ville ?? "—"}, {a.region ?? "—"} · {a.source ?? "—"}
                  </div>
                </div>
                {a.severite && <SeverityBadge level={a.severite} />}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
