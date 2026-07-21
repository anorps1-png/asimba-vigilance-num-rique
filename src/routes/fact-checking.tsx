import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { requireAuth } from "@/lib/auth";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { analyzeTextWithIaFn } from "./analyse-ia";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useFactChecks } from "@/lib/queries/staff";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type FactCheck = Database["public"]["Tables"]["fact_checks"]["Row"];

export const Route = createFileRoute("/fact-checking")({
  beforeLoad: ({ location }) => requireAuth(location),
  head: () => ({
    meta: [
      { title: "Fact-checking — ASIMBA" },
      {
        name: "description",
        content: "Vérification structurée des affirmations circulant en ligne au Cameroun.",
      },
    ],
  }),
  component: FactPage,
});

function StatusBadge({ verdict }: { verdict: FactCheck["verdict"] }) {
  const map: Record<string, { c: string; i: LucideIcon; l: string }> = {
    vrai: { c: "bg-success/10 text-success ring-success/30", i: CheckCircle2, l: "Vrai" },
    faux: { c: "bg-destructive/10 text-destructive ring-destructive/30", i: XCircle, l: "Faux" },
    trompeur: {
      c: "bg-warning/15 text-[color:oklch(0.45_0.15_60)] ring-warning/30",
      i: AlertTriangle,
      l: "Trompeur",
    },
    en_cours: {
      c: "bg-blue-10 text-blue-600 ring-blue-200",
      i: AlertTriangle,
      l: "En cours",
    },
  };
  const entry = map[verdict] || map.en_cours;
  const I = entry.i;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-semibold ring-1",
        entry.c,
      )}
    >
      <I className="h-3.5 w-3.5" /> {entry.l}
    </span>
  );
}

function FactPage() {
  const { data: factChecks, isLoading } = useFactChecks({ publie: true });
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const filtered = useMemo(() => {
    if (!factChecks) return [];
    const lower = searchTerm.toLowerCase();
    return factChecks.filter(
      (f: FactCheck) =>
        (f.affirmation?.toLowerCase() || "").includes(lower) ||
        (f.titre?.toLowerCase() || "").includes(lower),
    );
  }, [factChecks, searchTerm]);

  async function handleVerify() {
    if (!searchTerm.trim()) {
      toast.error("Veuillez saisir une affirmation à fact-checker.");
      return;
    }
    setIsChecking(true);
    toast.info("Analyse en cours par l'IA...", { description: "Veuillez patienter pendant l'évaluation." });

    try {
      const res = await analyzeTextWithIaFn({ data: searchTerm.trim() });
      if (res && res.success && res.data) {
        const aiData = res.data;

        // Insert into Supabase fact_checks table directly
        const { error } = await supabase
          .from("fact_checks")
          .insert({
            affirmation: searchTerm.trim(),
            titre: aiData.category || "Vérification automatisée",
            verdict: (aiData.verdict || "trompeur") as "vrai" | "faux" | "trompeur",
            justification: aiData.conclusion,
            confiance: aiData.score,
            sources: aiData.sources || ["ASIMBA AI"],
            publie: true,
            publie_at: new Date().toISOString(),
          });

        if (error) {
          throw error;
        }

        toast.success("Fact-checking terminé !", {
          description: `Verdict : ${aiData.verdict.toUpperCase()} (Indice : ${aiData.score}%)`,
        });
        setSearchTerm("");
        queryClient.invalidateQueries({ queryKey: ["fact_checks"] });
      } else {
        throw new Error(res?.error || "Une erreur inconnue s'est produite lors de l'analyse.");
      }
    } catch (err: any) {
      console.error("[Fact-checking Error]", err);
      toast.error("Erreur de fact-checking", {
        description: err.message || "Impossible de joindre le serveur d'analyse.",
      });
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <AppLayout title="Fact-checking" subtitle="Vérifications publiques">
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 space-y-6">
        <PageHeader
          eyebrow="Vérification"
          title="Base des vérifications"
          description="Chaque affirmation est confrontée à des sources officielles et à un score de fiabilité issu du moteur d'analyse."
        />

        <Card className="shadow-elev-1 p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher ou saisir une affirmation à fact-checker..."
                className="h-10 pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isChecking}
              />
            </div>
            <Button className="h-10" onClick={handleVerify} disabled={isChecking}>
              {isChecking && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {isChecking ? "Vérification..." : "Vérifier"}
            </Button>
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {searchTerm ? "Aucune vérification trouvée" : "Aucune vérification publiée"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((f: FactCheck) => (
              <Card key={f.id} className="shadow-elev-1 flex flex-col">
                <CardContent className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <StatusBadge verdict={f.verdict} />
                    {f.confiance && (
                      <div className="text-right">
                        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                          Confiance
                        </div>
                        <div className="text-[16px] font-semibold tabular-nums">
                          {Math.round(f.confiance)}%
                        </div>
                      </div>
                    )}
                  </div>
                  {f.affirmation && (
                    <blockquote className="border-l-2 border-primary pl-3 text-[13.5px] font-medium text-foreground">
                      « {f.affirmation} »
                    </blockquote>
                  )}
                  {f.titre && (
                    <div className="text-[12.5px] font-semibold">{f.titre}</div>
                  )}
                  {f.justification && (
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                      {f.justification}
                    </p>
                  )}
                  <div className="mt-auto">
                    {Array.isArray(f.sources) && f.sources.length > 0 && (
                      <>
                        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">
                          Sources
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(f.sources as string[]).map((s) => (
                            <Badge key={s} variant="secondary" className="gap-1 text-[11px]">
                              <ExternalLink className="h-3 w-3" />
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
                    {f.publie_at ? new Date(f.publie_at).toLocaleDateString("fr-FR") : "Non daté"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
